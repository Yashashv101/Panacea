package com.example.Panacea.fees.dto;

import com.example.Panacea.fees.entity.FeeStructure;

import java.math.BigDecimal;

public record FeeStructureResponse(
        Long id,
        Long courseId,
        String courseName,
        Long semesterId,
        BigDecimal amount
) {
    public static FeeStructureResponse from(FeeStructure feeStructure) {
        return new FeeStructureResponse(
                feeStructure.getId(),
                feeStructure.getCourse().getId(),
                feeStructure.getCourse().getName(),
                feeStructure.getSemester().getId(),
                feeStructure.getAmount());
    }
}
