package com.example.Panacea.student.dto;

/**
 * A specific flag on an at-risk student: which subject triggered the flag and why
 * (attendance < 75% or test1 + test2 < 20/50).
 */
public record AtRiskReason(
        Long subjectId,
        String subjectName,
        String reason, // "attendance" or "marks"
        Double attendancePercentage,
        Long totalSessions,
        Long presentSessions,
        Double test1,
        Double test2,
        Double marksTotal
) {
    public static AtRiskReason attendance(Long subjectId, String subjectName, double percentage, long total, long present) {
        return new AtRiskReason(subjectId, subjectName, "attendance", percentage, total, present, null, null, null);
    }

    public static AtRiskReason marks(Long subjectId, String subjectName, double test1, double test2) {
        return new AtRiskReason(subjectId, subjectName, "marks", null, null, null, test1, test2, test1 + test2);
    }
}
