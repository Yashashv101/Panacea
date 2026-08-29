package com.example.Panacea.proctor.dto;

import com.example.Panacea.proctor.entity.AssignmentType;
import com.example.Panacea.proctor.entity.ProctorAssignment;

import java.time.Instant;

public record ProctorAssignmentResponse(
        Long id,
        AssignmentType assignmentType,
        Long staffId,
        String staffName,
        String examSessionReference,
        Long studentId,
        String studentName,
        Instant assignedAt
) {
    public static ProctorAssignmentResponse from(ProctorAssignment assignment) {
        return new ProctorAssignmentResponse(
                assignment.getId(),
                assignment.getAssignmentType(),
                assignment.getStaff().getId(),
                assignment.getStaff().getFirstName() + " " + assignment.getStaff().getLastName(),
                assignment.getExamSessionReference(),
                assignment.getStudent() == null ? null : assignment.getStudent().getId(),
                assignment.getStudent() == null ? null
                        : assignment.getStudent().getFirstName() + " " + assignment.getStudent().getLastName(),
                assignment.getAssignedAt());
    }
}
