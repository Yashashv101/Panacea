package com.example.Panacea.attendance.dto;

public record AttendancePercentageResponse(
        Long studentId,
        Long subjectId,
        long totalSessions,
        long presentSessions,
        double percentage
) {
}
