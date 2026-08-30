package com.example.Panacea.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Role is deliberately not editable here — changing a user's role would leave
 * a STUDENT's profile row orphaned (or a newly-STUDENT user without one), and
 * that transition isn't handled by this endpoint. courseId/sectionId/semesterId
 * are required when the target user's role is STUDENT (and ignored otherwise),
 * same cross-field rule as CreateUserRequest. courseId is also required when
 * the target user's role is STAFF (sectionId/semesterId still ignored) — this
 * is the path an admin uses to backfill a department-less STAFF row.
 */
public record UpdateUserRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotNull Boolean enabled,
        Long courseId,
        Long sectionId,
        Long semesterId
) {
}
