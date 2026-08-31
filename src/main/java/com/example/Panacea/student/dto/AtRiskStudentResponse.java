package com.example.Panacea.student.dto;

import java.util.List;

/**
 * An at-risk student entry returned to an HOD: the student's identity and
 * department placement, plus the list of subject-level reasons they were flagged.
 */
public record AtRiskStudentResponse(
        Long studentId,
        String studentName,
        String email,
        String courseName,
        String sectionName,
        Long semesterId,
        String semesterLabel,
        List<AtRiskReason> reasons
) {
}
