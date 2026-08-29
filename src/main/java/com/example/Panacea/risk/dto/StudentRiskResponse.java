package com.example.Panacea.risk.dto;

import java.util.List;

public record StudentRiskResponse(
        Long studentId,
        String studentName,
        double attendancePercentage,
        double averageMarksPercentage,
        double marksTrend,
        double riskProbability,
        String riskLevel,
        List<RiskFactorContribution> riskFactors,
        Double riskTrendDelta
) {
    public record RiskFactorContribution(String factor, double contribution) {
    }
}
