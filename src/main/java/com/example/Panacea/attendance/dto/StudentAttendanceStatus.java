package com.example.Panacea.attendance.dto;

import jakarta.validation.constraints.NotNull;

public record StudentAttendanceStatus(
        @NotNull Long studentId,
        boolean present
) {
}
