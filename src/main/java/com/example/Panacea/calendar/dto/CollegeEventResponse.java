package com.example.Panacea.calendar.dto;

import com.example.Panacea.calendar.entity.CollegeEvent;

import java.time.LocalDate;
import java.time.LocalTime;

public record CollegeEventResponse(
        Long id,
        LocalDate date,
        String title,
        String description,
        LocalTime timeOfDay,
        String location
) {
    public static CollegeEventResponse from(CollegeEvent event) {
        return new CollegeEventResponse(
                event.getId(),
                event.getDate(),
                event.getTitle(),
                event.getDescription(),
                event.getTimeOfDay(),
                event.getLocation());
    }
}
