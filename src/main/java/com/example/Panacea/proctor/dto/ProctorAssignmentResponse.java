package com.example.Panacea.proctor.dto;

import com.example.Panacea.proctor.entity.ProctorAssignment;

import java.time.Instant;

public record ProctorAssignmentResponse(
        Long id,
        Long staffId,
        String staffName,
        String examSessionReference,
        Instant assignedAt
) {
    public static ProctorAssignmentResponse from(ProctorAssignment assignment) {
        return new ProctorAssignmentResponse(
                assignment.getId(),
                assignment.getStaff().getId(),
                assignment.getStaff().getFirstName() + " " + assignment.getStaff().getLastName(),
                assignment.getExamSessionReference(),
                assignment.getAssignedAt());
    }
}
