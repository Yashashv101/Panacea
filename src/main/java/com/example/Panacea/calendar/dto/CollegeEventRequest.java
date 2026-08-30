package com.example.Panacea.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record CollegeEventRequest(
        @NotNull LocalDate date,
        @NotBlank String title,
        String description,
        LocalTime timeOfDay,
        String location
) {
}
