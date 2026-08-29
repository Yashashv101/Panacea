package com.example.Panacea.enrollment.dto;

import jakarta.validation.constraints.NotNull;

public record SubmitElectiveEnrollmentRequest(
        @NotNull Long subjectId
) {
}
