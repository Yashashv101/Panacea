package com.example.Panacea.timetable.dto;

import jakarta.validation.constraints.NotNull;

public record GenerateTimetableRequest(
        @NotNull Long semesterId,
        @NotNull Long sectionId
) {
}
