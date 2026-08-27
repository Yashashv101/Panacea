package com.example.Panacea.fees.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateFeeStructureRequest(
        @NotNull Long courseId,
        @NotNull Long semesterId,
        @NotNull @DecimalMin("0.0") BigDecimal amount
) {
}
