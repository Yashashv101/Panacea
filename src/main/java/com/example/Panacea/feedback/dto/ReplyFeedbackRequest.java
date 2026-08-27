package com.example.Panacea.feedback.dto;

import jakarta.validation.constraints.NotBlank;

public record ReplyFeedbackRequest(
        @NotBlank String reply
) {
}
