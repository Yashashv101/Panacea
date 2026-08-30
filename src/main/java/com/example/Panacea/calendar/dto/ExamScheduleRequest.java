package com.example.Panacea.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ExamScheduleRequest(
        @NotNull LocalDate startDate,
        LocalDate endDate,
        @NotBlank String name,
        String description,
        @NotNull Long semesterId,
        Long courseId
) {
}
