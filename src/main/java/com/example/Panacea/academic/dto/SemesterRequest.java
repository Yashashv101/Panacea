package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.SemesterParity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * parity is required even though it's fully derivable from number — the
 * caller states what it believes the parity is, and SemesterService rejects
 * the request if that doesn't match the number-derived value, rather than
 * silently overriding a caller's wrong belief. See SemesterService#deriveParity.
 */
public record SemesterRequest(
        @NotNull @Positive Integer number,
        @NotBlank String label,
        @NotNull Long sessionId,
        @NotNull SemesterParity parity
) {
}
