package com.example.Panacea.risk.dto;

import com.example.Panacea.risk.entity.RiskSnapshot;

import java.time.Instant;

public record RiskSnapshotResponse(
        Instant computedAt,
        double attendancePercentage,
        double averageMarksPercentage,
        double riskProbability,
        String riskLevel
) {
    public static RiskSnapshotResponse from(RiskSnapshot snapshot) {
        return new RiskSnapshotResponse(
                snapshot.getComputedAt(),
                snapshot.getAttendancePercentage(),
                snapshot.getAverageMarksPercentage(),
                snapshot.getRiskProbability(),
                snapshot.getRiskLevel());
    }
}
