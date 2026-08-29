package com.example.Panacea.results.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record UpsertResultRequest(
        @NotNull Long studentId,
        @NotNull Long subjectId,
        @NotNull Long semesterId,
        @NotNull @DecimalMin("0.0") @DecimalMax("25.0") Double test1,
        @NotNull @DecimalMin("0.0") @DecimalMax("25.0") Double test2,
        @NotNull @DecimalMin("0.0") @DecimalMax("30.0") Double experiential,
        @NotNull Double see
) {
}
