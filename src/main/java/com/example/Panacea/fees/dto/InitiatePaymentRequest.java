package com.example.Panacea.fees.dto;

import jakarta.validation.constraints.NotNull;

public record InitiatePaymentRequest(
        @NotNull Long courseId,
        @NotNull Long semesterId
) {
}
