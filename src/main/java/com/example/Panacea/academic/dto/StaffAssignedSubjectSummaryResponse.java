package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.SubjectType;

import java.util.List;

public record StaffAssignedSubjectSummaryResponse(
        Long subjectId,
        String subjectName,
        Integer credits,
        SubjectType type,
        Long courseId,
        String courseName,
        Long semesterId,
        String semesterLabel,
        List<AssignedSectionSummary> sections
) {
    public record AssignedSectionSummary(
            Long id,
            String name
    ) {
    }
}
