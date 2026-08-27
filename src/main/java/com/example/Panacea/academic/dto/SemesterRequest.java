package com.example.Panacea.academic.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record SemesterRequest(
        @NotNull @Positive Integer number,
        @NotBlank String label
) {
}
