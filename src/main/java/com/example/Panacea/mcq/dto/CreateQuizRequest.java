package com.example.Panacea.mcq.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateQuizRequest(
        @NotBlank String title,
        @NotNull Long subjectId,
        @NotEmpty @Valid List<QuestionRequest> questions
) {
    public record QuestionRequest(
            @NotBlank String text,
            @NotEmpty List<@NotBlank String> options,
            @NotNull Integer correctOptionIndex
    ) {
    }
}
