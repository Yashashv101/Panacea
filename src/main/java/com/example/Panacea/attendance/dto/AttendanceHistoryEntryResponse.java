package com.example.Panacea.attendance.dto;

import java.time.LocalDate;

public record AttendanceHistoryEntryResponse(
        LocalDate date,
        Integer period,
        boolean present
) {
}
