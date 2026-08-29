package com.example.Panacea.enrollment.dto;

import com.example.Panacea.enrollment.entity.ElectiveEnrollmentRequest;
import com.example.Panacea.enrollment.entity.EnrollmentStatus;

import java.time.Instant;

public record ElectiveEnrollmentResponse(
        Long id,
        Long studentId,
        String studentName,
        Long subjectId,
        String subjectName,
        Long semesterId,
        EnrollmentStatus status,
        Long mentorId,
        String mentorName,
        Instant decidedAt
) {
    public static ElectiveEnrollmentResponse from(ElectiveEnrollmentRequest request) {
        return new ElectiveEnrollmentResponse(
                request.getId(),
                request.getStudent().getId(),
                request.getStudent().getFirstName() + " " + request.getStudent().getLastName(),
                request.getSubject().getId(),
                request.getSubject().getName(),
                request.getSemester().getId(),
                request.getStatus(),
                request.getMentor() != null ? request.getMentor().getId() : null,
                request.getMentor() != null
                        ? request.getMentor().getFirstName() + " " + request.getMentor().getLastName()
                        : null,
                request.getDecidedAt());
    }
}
