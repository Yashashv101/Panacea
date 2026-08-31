package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.PreviousYearPaper;

import java.time.Instant;

public record PreviousYearPaperResponse(
        Long id,
        Long subjectId,
        String subjectName,
        String title,
        String description,
        Long uploadedById,
        String uploadedByName,
        Instant createdAt
) {
    public static PreviousYearPaperResponse from(PreviousYearPaper paper) {
        return new PreviousYearPaperResponse(
                paper.getId(),
                paper.getSubject().getId(),
                paper.getSubject().getName(),
                paper.getTitle(),
                paper.getDescription(),
                paper.getUploadedBy().getId(),
                paper.getUploadedBy().getFirstName() + " " + paper.getUploadedBy().getLastName(),
                paper.getCreatedAt());
    }
}
