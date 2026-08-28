package com.example.Panacea.fees;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.fees.entity.FeePayment;
import com.example.Panacea.fees.entity.PaymentStatus;
import com.example.Panacea.fees.repository.FeePaymentRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The Stripe signature check is the sole authentication for this endpoint — no
 * JWT is involved — so these tests exercise it directly: a validly-signed
 * checkout.session.completed event moves the payment to PAID, a validly-signed
 * checkout.session.expired event moves it to FAILED, and an incorrectly-signed
 * event is rejected without touching payment state.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "panacea.stripe.webhook-secret=whsec_test_secret")
class FeeWebhookControllerTest extends AbstractPostgresContainerTest {

    private static final String WEBHOOK_SECRET = "whsec_test_secret";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FeePaymentRepository feePaymentRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void validlySignedCheckoutCompletedEventMarksPaymentPaid() throws Exception {
        FeePayment payment = persistPendingPayment("cs_test_valid");
        String payload = checkoutSessionPayload("checkout.session.completed", "cs_test_valid", "pi_test_valid");

        mockMvc.perform(post("/api/fees/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Stripe-Signature", sign(payload, WEBHOOK_SECRET))
                        .content(payload))
                .andExpect(status().isOk());

        FeePayment reloaded = feePaymentRepository.findByIdempotencyKey("cs_test_valid").orElseThrow();
        assertEquals(PaymentStatus.PAID, reloaded.getStatus());
        assertEquals("pi_test_valid", reloaded.getPaymentReference());
    }

    @Test
    @Transactional
    void validlySignedCheckoutExpiredEventMarksPaymentFailed() throws Exception {
        FeePayment payment = persistPendingPayment("cs_test_expired");
        String payload = checkoutSessionPayload("checkout.session.expired", "cs_test_expired", "pi_test_expired");

        mockMvc.perform(post("/api/fees/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Stripe-Signature", sign(payload, WEBHOOK_SECRET))
                        .content(payload))
                .andExpect(status().isOk());

        FeePayment reloaded = feePaymentRepository.findByIdempotencyKey("cs_test_expired").orElseThrow();
        assertEquals(PaymentStatus.FAILED, reloaded.getStatus());
    }

    @Test
    @Transactional
    void invalidSignatureIsRejectedWithoutTouchingPaymentState() throws Exception {
        FeePayment payment = persistPendingPayment("cs_test_invalid");
        String payload = checkoutSessionPayload("checkout.session.completed", "cs_test_invalid", "pi_test_invalid");

        mockMvc.perform(post("/api/fees/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Stripe-Signature", "t=1,v1=not-a-real-signature")
                        .content(payload))
                .andExpect(status().isUnauthorized());

        FeePayment reloaded = feePaymentRepository.findByIdempotencyKey("cs_test_invalid").orElseThrow();
        assertEquals(PaymentStatus.PENDING, reloaded.getStatus());
    }

    private FeePayment persistPendingPayment(String stripeSessionId) {
        Course course = persist(Course.builder().name("BSc CS " + stripeSessionId).build());
        Semester semester = persist(Semester.builder().number(1).label("Semester 1 " + stripeSessionId).build());
        User student = persist(User.builder()
                .email(stripeSessionId + "@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());

        return persist(FeePayment.builder()
                .student(student)
                .course(course)
                .semester(semester)
                .amount(BigDecimal.valueOf(1000))
                .idempotencyKey(stripeSessionId)
                .build());
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }

    private String checkoutSessionPayload(String eventType, String sessionId, String paymentIntentId) {
        return """
                {
                  "id": "evt_test_%s",
                  "object": "event",
                  "api_version": "2020-08-27",
                  "created": 1700000000,
                  "type": "%s",
                  "livemode": false,
                  "pending_webhooks": 0,
                  "request": {"id": null, "idempotency_key": null},
                  "data": {
                    "object": {
                      "id": "%s",
                      "object": "checkout.session",
                      "payment_intent": "%s",
                      "payment_status": "unpaid",
                      "mode": "payment",
                      "status": "expired"
                    }
                  }
                }
                """.formatted(sessionId, eventType, sessionId, paymentIntentId);
    }

    private String sign(String payload, String secret) throws Exception {
        long timestamp = Instant.now().getEpochSecond();
        String signedPayload = timestamp + "." + payload;

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));

        return "t=" + timestamp + ",v1=" + HexFormat.of().formatHex(hash);
    }
}
