package com.example.Panacea.timetable.dto;

import jakarta.validation.constraints.NotNull;

public record PublishTimetableRequest(@NotNull Long semesterId, @NotNull Long courseId) {
}
