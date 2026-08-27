package com.example.Panacea.attendance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record MarkAttendanceRequest(
        @NotNull Long subjectId,
        @NotNull Long sectionId,
        @NotNull LocalDate date,
        @NotNull Integer period,
        @NotEmpty @Valid List<StudentAttendanceStatus> students
) {
}
