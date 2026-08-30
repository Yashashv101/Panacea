package com.example.Panacea.calendar.dto;

import com.example.Panacea.calendar.entity.Holiday;

import java.time.LocalDate;

public record HolidayResponse(Long id, LocalDate date, String name, String description) {
    public static HolidayResponse from(Holiday holiday) {
        return new HolidayResponse(holiday.getId(), holiday.getDate(), holiday.getName(), holiday.getDescription());
    }
}
