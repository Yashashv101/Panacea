package com.example.Panacea.fees.dto;

import com.example.Panacea.fees.entity.PaymentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ConfirmPaymentRequest(
        @NotBlank String paymentReference,
        @NotNull PaymentStatus outcome
) {
}
