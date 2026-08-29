package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.Semester;

public record SemesterResponse(Long id, Integer number, String label, Long sessionId) {
    public static SemesterResponse from(Semester semester) {
        return new SemesterResponse(
                semester.getId(),
                semester.getNumber(),
                semester.getLabel(),
                semester.getSession() != null ? semester.getSession().getId() : null);
    }
}
