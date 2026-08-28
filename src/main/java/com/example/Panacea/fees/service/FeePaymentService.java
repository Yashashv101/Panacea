package com.example.Panacea.fees.service;

import com.example.Panacea.fees.dto.FeePaymentResponse;
import com.example.Panacea.fees.dto.InitiatePaymentRequest;
import com.example.Panacea.fees.entity.FeePayment;
import com.example.Panacea.fees.entity.FeeStructure;
import com.example.Panacea.fees.entity.PaymentStatus;
import com.example.Panacea.fees.repository.FeePaymentRepository;
import com.example.Panacea.fees.repository.FeeStructureRepository;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
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
    private final FeeStructureRepository feeStructureRepository;
    private final UserRepository userRepository;

    @Value("${panacea.stripe.currency}")
    private String currency;

    @Value("${panacea.stripe.success-url}")
    private String successUrl;

    @Value("${panacea.stripe.cancel-url}")
    private String cancelUrl;

    @Transactional
    public FeePaymentResponse initiate(InitiatePaymentRequest request, Long studentId) throws StripeException {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("User " + studentId + " not found"));
        FeeStructure feeStructure = feeStructureRepository
                .findByCourseIdAndSemesterId(request.courseId(), request.semesterId())
                .orElseThrow(() -> new EntityNotFoundException("No fee structure for course "
                        + request.courseId() + " and semester " + request.semesterId()));

        Session session = createCheckoutSession(feeStructure);

        // idempotencyKey is the Stripe Checkout Session id — the webhook looks the
        // payment up by this key, never by a client-supplied value. stripePaymentIntentId
        // is captured too since some webhook events (payment_intent.payment_failed)
        // only carry the intent id, not the session id.
        FeePayment payment = FeePayment.builder()
                .student(student)
                .course(feeStructure.getCourse())
                .semester(feeStructure.getSemester())
                .amount(feeStructure.getAmount())
                .idempotencyKey(session.getId())
                .stripePaymentIntentId(session.getPaymentIntent())
                .build();

        return FeePaymentResponse.from(feePaymentRepository.save(payment), session.getUrl());
    }

    private Session createCheckoutSession(FeeStructure feeStructure) throws StripeException {
        long unitAmount = feeStructure.getAmount().multiply(BigDecimal.valueOf(100)).longValueExact();

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

    @Transactional(readOnly = true)
    public List<FeePaymentResponse> findAll() {
        return feePaymentRepository.findAll().stream().map(FeePaymentResponse::from).toList();
    }
}
