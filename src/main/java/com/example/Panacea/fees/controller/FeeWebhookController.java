package com.example.Panacea.fees.controller;

import com.example.Panacea.fees.service.FeePaymentService;
import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Not behind JWT/@PreAuthorize — Stripe cannot send a JWT. The Stripe signature
 * check below IS the authentication for this endpoint; an unsigned or
 * incorrectly-signed request is rejected outright and never reaches
 * {@link FeePaymentService#confirm}.
 */
@Slf4j
@RestController
@RequestMapping("/api/fees")
@RequiredArgsConstructor
public class FeeWebhookController {

    private final FeePaymentService feePaymentService;

    @Value("${panacea.stripe.webhook-secret}")
    private String webhookSecret;

    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(@RequestBody String payload,
                                               @RequestHeader("Stripe-Signature") String signatureHeader) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, signatureHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.warn("Rejected Stripe webhook with invalid signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        StripeObject stripeObject = resolveDataObject(event);
        if (stripeObject == null) {
            return ResponseEntity.ok().build();
        }

        switch (event.getType()) {
            case "checkout.session.completed" -> {
                if (stripeObject instanceof Session session) {
                    feePaymentService.confirm(session.getId(), session.getPaymentIntent());
                }
            }
            case "checkout.session.expired" -> {
                if (stripeObject instanceof Session session) {
                    feePaymentService.failBySessionId(session.getId(), session.getPaymentIntent());
                }
            }
            case "payment_intent.payment_failed" -> {
                if (stripeObject instanceof PaymentIntent paymentIntent) {
                    feePaymentService.failByPaymentIntentId(paymentIntent.getId());
                }
            }
            default -> {
                // No-op: this endpoint only listens for the events above.
            }
        }

        return ResponseEntity.ok().build();
    }

    private StripeObject resolveDataObject(Event event) {
        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        StripeObject stripeObject = deserializer.getObject().orElse(null);
        if (stripeObject != null) {
            return stripeObject;
        }

        try {
            return deserializer.deserializeUnsafe();
        } catch (EventDataObjectDeserializationException e) {
            log.warn("Could not deserialize Stripe {} payload", event.getType(), e);
            return null;
        }
    }
}
