package com.example.Panacea.timetable.dto;

import java.util.List;

public record TimetableGenerationResponse(int created, int skipped, List<String> errors) {
}
