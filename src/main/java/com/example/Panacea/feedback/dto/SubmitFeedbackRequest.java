package com.example.Panacea.feedback.dto;

import jakarta.validation.constraints.NotBlank;

public record SubmitFeedbackRequest(
        @NotBlank String message
) {
}
