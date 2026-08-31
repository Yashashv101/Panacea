package com.example.Panacea.academic.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

public record SubjectStaffAssignmentRequest(
        @NotNull(message = "staffId is required")
        Long staffId,

        @NotNull(message = "subjectId is required")
        Long subjectId,

        @NotEmpty(message = "At least one sectionId must be provided")
        Set<Long> sectionIds
) {
}
