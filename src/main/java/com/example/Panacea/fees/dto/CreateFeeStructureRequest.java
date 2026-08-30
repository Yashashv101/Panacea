package com.example.Panacea.fees.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Shared by both create and update — same reuse pattern as SemesterRequest.
 */
public record CreateFeeStructureRequest(
        @NotNull Long courseId,
        @NotNull Long semesterId,
        @NotNull @DecimalMin("0.0") BigDecimal tuitionAmount,
        @NotNull @DecimalMin("0.0") BigDecimal examFeeAmount
) {
}
