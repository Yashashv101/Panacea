package com.example.Panacea.fees.service;

import com.example.Panacea.fees.dto.FeePaymentResponse;
import com.example.Panacea.fees.entity.FeePayment;
import com.example.Panacea.fees.entity.FeeStructure;
import com.example.Panacea.fees.entity.PaymentStatus;
import com.example.Panacea.fees.repository.FeePaymentRepository;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.HodScopeResolver;
import com.example.Panacea.identity.security.UserPrincipal;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FeePaymentService {

    private final FeePaymentRepository feePaymentRepository;
    private final FeeStructureService feeStructureService;
    private final UserRepository userRepository;
    private final HodScopeResolver hodScopeResolver;

    @Value("${panacea.stripe.currency}")
    private String currency;

    @Value("${panacea.stripe.success-url}")
    private String successUrl;

    @Value("${panacea.stripe.cancel-url}")
    private String cancelUrl;

    /**
     * The student always pays for themselves here — there is no admin/staff-
     * initiated-on-a-student's-behalf path in this module — so course and
     * semester are resolved from the student's own StudentProfile rather than
     * taken from the request, same fix as ElectiveEnrollmentController#availableElectives.
     *
     * The amount charged is tuitionAmount + examFeeAmount, computed here from
     * FeeStructure — never a client-supplied breakdown or total — and that single
     * combined total is what goes into the one Stripe Checkout Session, same as
     * before this was split into two components. FeePayment.amount stores only
     * the combined total, not the breakdown, since Stripe/the webhook only ever
     * need to know what was charged, not what it was itemized as.
     */
    @Transactional
    public FeePaymentResponse initiate(Long studentId) throws StripeException {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("User " + studentId + " not found"));
        FeeStructure feeStructure = feeStructureService.resolveForStudent(studentId);
        BigDecimal total = feeStructure.getTotalAmount();

        Session session = createCheckoutSession(feeStructure, total);

        // idempotencyKey is the Stripe Checkout Session id — the webhook looks the
        // payment up by this key, never by a client-supplied value. stripePaymentIntentId
        // is captured too since some webhook events (payment_intent.payment_failed)
        // only carry the intent id, not the session id.
        FeePayment payment = FeePayment.builder()
                .student(student)
                .course(feeStructure.getCourse())
                .semester(feeStructure.getSemester())
                .amount(total)
                .idempotencyKey(session.getId())
                .stripePaymentIntentId(session.getPaymentIntent())
                .build();

        return FeePaymentResponse.from(feePaymentRepository.save(payment), session.getUrl());
    }

    private Session createCheckoutSession(FeeStructure feeStructure, BigDecimal total) throws StripeException {
        long unitAmount = total.multiply(BigDecimal.valueOf(100)).longValueExact();

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(currency)
                                .setUnitAmount(unitAmount)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName("Fee payment — " + feeStructure.getCourse().getName()
                                                + " / " + feeStructure.getSemester().getLabel())
                                        .build())
                                .build())
                        .build())
                .build();

        return Session.create(params);
    }

    /**
     * Confirms a payment as PAID. Only reachable via the verified Stripe webhook —
     * not exposed as a public endpoint, since a webhook call has no user role to
     * authorize against.
     */
    @Transactional
    public FeePaymentResponse confirm(String stripeSessionId, String paymentReference) {
        FeePayment payment = feePaymentRepository.findByIdempotencyKey(stripeSessionId)
                .orElseThrow(() -> new EntityNotFoundException("Payment " + stripeSessionId + " not found"));
        return transitionToTerminalStatus(payment, PaymentStatus.PAID, paymentReference);
    }

    /**
     * Fails a payment whose Checkout Session expired before the student paid.
     * Only reachable via the verified Stripe webhook, same as {@link #confirm}.
     */
    @Transactional
    public FeePaymentResponse failBySessionId(String stripeSessionId, String paymentReference) {
        FeePayment payment = feePaymentRepository.findByIdempotencyKey(stripeSessionId)
                .orElseThrow(() -> new EntityNotFoundException("Payment " + stripeSessionId + " not found"));
        return transitionToTerminalStatus(payment, PaymentStatus.FAILED, paymentReference);
    }

    /**
     * Fails a payment whose PaymentIntent failed (e.g. card declined). Looked up
     * by PaymentIntent id rather than the Checkout Session id, since that's the
     * only identifier payment_intent.payment_failed carries. Only reachable via
     * the verified Stripe webhook, same as {@link #confirm}.
     */
    @Transactional
    public FeePaymentResponse failByPaymentIntentId(String stripePaymentIntentId) {
        FeePayment payment = feePaymentRepository.findByStripePaymentIntentId(stripePaymentIntentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Payment for Stripe PaymentIntent " + stripePaymentIntentId + " not found"));
        return transitionToTerminalStatus(payment, PaymentStatus.FAILED, stripePaymentIntentId);
    }

    /**
     * A payment can only leave PENDING once. If a webhook fires after that —
     * whether a genuine retry or a stray event for an already-PAID/FAILED
     * payment — it's a no-op rather than an error or a re-process.
     */
    private FeePaymentResponse transitionToTerminalStatus(FeePayment payment, PaymentStatus target,
                                                            String paymentReference) {
        if (payment.getStatus() != PaymentStatus.PENDING) {
            return FeePaymentResponse.from(payment);
        }

        payment.setStatus(target);
        payment.setPaymentReference(paymentReference);
        return FeePaymentResponse.from(feePaymentRepository.save(payment));
    }

    @Transactional(readOnly = true)
    public List<FeePaymentResponse> findOwn(Long studentId) {
        return feePaymentRepository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(FeePaymentResponse::from)
                .toList();
    }

    /**
     * ADMIN sees every payment, unfiltered. An HOD is scoped to their own
     * department via FeePayment.course directly — not a StudentProfile
     * lookup: this entity already stores its own course (copied from the
     * FeeStructure at initiate() time above), which is simpler and cheaper
     * than re-deriving it through the paying student's profile, and can't
     * drift from what the payment was actually for even if the student's
     * profile course changes later.
     */
    @Transactional(readOnly = true)
    public List<FeePaymentResponse> findAll(UserPrincipal principal) {
        List<FeePayment> payments = feePaymentRepository.findAll();

        payments = hodScopeResolver.filterByHodScope(principal, payments, p -> p.getCourse().getId());

        return payments.stream().map(FeePaymentResponse::from).toList();
    }
}
