package com.example.Panacea.identity.dto;

import jakarta.validation.constraints.NotNull;

public record SetEnabledRequest(@NotNull Boolean enabled) {
}
