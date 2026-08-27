package com.example.Panacea.academic.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SectionRequest(
        @NotBlank String name,
        @NotNull Long courseId
) {
}
