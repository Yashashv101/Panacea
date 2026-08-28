package com.example.Panacea.fees.dto;

import com.example.Panacea.fees.entity.FeePayment;
import com.example.Panacea.fees.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record FeePaymentResponse(
        Long id,
        Long studentId,
        String studentName,
        Long courseId,
        Long semesterId,
        BigDecimal amount,
        PaymentStatus status,
        String idempotencyKey,
        String paymentReference,
        Instant createdAt,
        String checkoutUrl
) {
    public static FeePaymentResponse from(FeePayment payment) {
        return from(payment, null);
    }

    public static FeePaymentResponse from(FeePayment payment, String checkoutUrl) {
        return new FeePaymentResponse(
                payment.getId(),
                payment.getStudent().getId(),
                payment.getStudent().getFirstName() + " " + payment.getStudent().getLastName(),
                payment.getCourse().getId(),
                payment.getSemester().getId(),
                payment.getAmount(),
                payment.getStatus(),
                payment.getIdempotencyKey(),
                payment.getPaymentReference(),
                payment.getCreatedAt(),
                checkoutUrl);
    }
}
