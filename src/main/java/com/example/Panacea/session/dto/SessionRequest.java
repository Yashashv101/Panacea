package com.example.Panacea.session.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record SessionRequest(
        @NotNull LocalDate startYear,
        @NotNull LocalDate endYear
) {
}
