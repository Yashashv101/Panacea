package com.example.Panacea.timetable.dto;

import com.example.Panacea.timetable.entity.TimetableEntry;

public record TimetableEntryResponse(
        Long id,
        Long subjectId,
        String subjectName,
        Long sectionId,
        String sectionName,
        Long staffId,
        String staffName,
        String day,
        Integer period
) {
    public static TimetableEntryResponse from(TimetableEntry entry) {
        return new TimetableEntryResponse(
                entry.getId(),
                entry.getSubject().getId(),
                entry.getSubject().getName(),
                entry.getSection().getId(),
                entry.getSection().getName(),
                entry.getStaff().getId(),
                entry.getStaff().getFirstName() + " " + entry.getStaff().getLastName(),
                entry.getDay().name(),
                entry.getPeriod());
    }
}
