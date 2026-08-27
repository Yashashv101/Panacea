package com.example.Panacea.proctor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateProctorAssignmentRequest(
        @NotNull Long staffId,
        @NotBlank String examSessionReference
) {
}
