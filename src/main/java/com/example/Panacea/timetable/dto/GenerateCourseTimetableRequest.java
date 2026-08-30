package com.example.Panacea.timetable.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * No sessionId field: the session is implied via Semester -> Session (every
 * Semester belongs to exactly one Session as of the Part 1 auto-create
 * change), so requiring it here would be redundant with semesterId.
 * electiveSubjectIds is the admin's checkbox selection; core subjects for
 * this course+semester are always included and are not listed here — see
 * TimetableService#generateForCourse.
 */
public record GenerateCourseTimetableRequest(
        @NotNull Long semesterId,
        @NotNull Long courseId,
        List<Long> electiveSubjectIds
) {
}
