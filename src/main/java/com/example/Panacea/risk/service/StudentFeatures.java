package com.example.Panacea.risk.service;

record StudentFeatures(
        Long studentId,
        String studentName,
        double attendancePercentage,
        double averageMarksPercentage,
        double marksTrend
) {
}
