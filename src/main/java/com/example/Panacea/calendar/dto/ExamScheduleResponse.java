package com.example.Panacea.calendar.dto;

import com.example.Panacea.calendar.entity.ExamSchedule;

import java.time.LocalDate;

public record ExamScheduleResponse(
        Long id,
        LocalDate startDate,
        LocalDate endDate,
        String name,
        String description,
        Long semesterId,
        Long sessionId,
        Long courseId
) {
    public static ExamScheduleResponse from(ExamSchedule exam) {
        return new ExamScheduleResponse(
                exam.getId(),
                exam.getStartDate(),
                exam.getEndDate(),
                exam.getName(),
                exam.getDescription(),
                exam.getSemester() != null ? exam.getSemester().getId() : null,
                exam.getSemester() != null && exam.getSemester().getSession() != null
                        ? exam.getSemester().getSession().getId()
                        : null,
                exam.getCourse() != null ? exam.getCourse().getId() : null);
    }
}
