package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.Section;

public record SectionResponse(Long id, String name, Long courseId, String courseName) {
    public static SectionResponse from(Section section) {
        return new SectionResponse(
                section.getId(),
                section.getName(),
                section.getCourse().getId(),
                section.getCourse().getName());
    }
}
