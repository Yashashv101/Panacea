package com.example.Panacea.calendar.dto;

import com.example.Panacea.calendar.entity.CollegeEvent;
import com.example.Panacea.calendar.entity.ExamSchedule;
import com.example.Panacea.calendar.entity.Holiday;

import java.time.LocalDate;

/**
 * Unified read-only shape for the "everything upcoming" feed — merges the
 * three distinct entities into one sorted list for student/staff display.
 * endDate is null for a single-day entry (Holiday, CollegeEvent, or a
 * single-day ExamSchedule).
 */
public record CalendarEntryResponse(
        CalendarEntryType type,
        LocalDate date,
        LocalDate endDate,
        String title,
        String description
) {
    public static CalendarEntryResponse from(Holiday holiday) {
        return new CalendarEntryResponse(
                CalendarEntryType.HOLIDAY, holiday.getDate(), null, holiday.getName(), holiday.getDescription());
    }

    public static CalendarEntryResponse from(CollegeEvent event) {
        return new CalendarEntryResponse(
                CalendarEntryType.EVENT, event.getDate(), null, event.getTitle(), event.getDescription());
    }

    public static CalendarEntryResponse from(ExamSchedule exam) {
        return new CalendarEntryResponse(
                CalendarEntryType.EXAM, exam.getStartDate(), exam.getEndDate(), exam.getName(), exam.getDescription());
    }
}
