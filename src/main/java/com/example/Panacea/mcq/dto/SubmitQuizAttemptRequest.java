package com.example.Panacea.mcq.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record SubmitQuizAttemptRequest(
        @NotEmpty Map<@NotNull Long, @NotNull Integer> answers
) {
}
