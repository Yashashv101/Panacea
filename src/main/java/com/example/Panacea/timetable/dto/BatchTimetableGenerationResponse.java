package com.example.Panacea.timetable.dto;

import java.util.List;

public record BatchTimetableGenerationResponse(
        int created,
        int skipped,
        List<String> errors,
        List<SectionGenerationSummary> sections
) {
}
