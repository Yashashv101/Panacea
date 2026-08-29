package com.example.Panacea.proctor.dto;

import com.example.Panacea.proctor.entity.AssignmentType;
import jakarta.validation.constraints.NotNull;

/**
 * examSessionReference is required (and student must be null) when assignmentType
 * is EXAM; student is required (and examSessionReference must be null) when
 * assignmentType is MENTOR. That cross-field requirement can't be expressed with
 * per-field Bean Validation annotations alone, so it's checked in
 * ProctorAssignmentService instead.
 */
public record CreateProctorAssignmentRequest(
        @NotNull Long staffId,
        @NotNull AssignmentType assignmentType,
        String examSessionReference,
        Long studentId
) {
}
