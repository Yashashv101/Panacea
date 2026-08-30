package com.example.Panacea.academic.dto;

import jakarta.validation.constraints.NotNull;

public record SetActiveRequest(@NotNull Boolean active) {
}
