package com.example.Panacea.results.dto;

import jakarta.validation.constraints.NotNull;

public record UpsertResultRequest(
        @NotNull Long studentId,
        @NotNull Long subjectId,
        @NotNull Long semesterId,
        @NotNull Double test1,
        @NotNull Double test2,
        @NotNull Double quiz,
        @NotNull Double experiential,
        @NotNull Double see
) {
}
