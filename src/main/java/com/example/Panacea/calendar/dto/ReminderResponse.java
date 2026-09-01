package com.example.Panacea.calendar.dto;

import com.example.Panacea.calendar.entity.Reminder;

import java.time.Instant;
import java.time.LocalDate;

public record ReminderResponse(
        Long id,
        LocalDate date,
        String title,
        String description,
        String time,
        boolean completed,
        Instant createdAt
) {
    public static ReminderResponse from(Reminder reminder) {
        return new ReminderResponse(
                reminder.getId(),
                reminder.getDate(),
                reminder.getTitle(),
                reminder.getDescription(),
                reminder.getTime(),
                reminder.isCompleted(),
                reminder.getCreatedAt()
        );
    }
}
