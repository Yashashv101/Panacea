package com.example.Panacea.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ReminderRequest(
        @NotNull(message = "Date is required")
        LocalDate date,

        @NotBlank(message = "Title is required")
        @Size(max = 255, message = "Title must not exceed 255 characters")
        String title,

        @Size(max = 1000, message = "Description must not exceed 1000 characters")
        String description,

        @Size(max = 50, message = "Time must not exceed 50 characters")
        String time
) {}
