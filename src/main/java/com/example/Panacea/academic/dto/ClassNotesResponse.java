package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.ClassNotes;

import java.time.Instant;

public record ClassNotesResponse(
        Long id,
        Long subjectId,
        String subjectName,
        String title,
        String description,
        Long uploadedById,
        String uploadedByName,
        Instant createdAt
) {
    public static ClassNotesResponse from(ClassNotes notes) {
        return new ClassNotesResponse(
                notes.getId(),
                notes.getSubject().getId(),
                notes.getSubject().getName(),
                notes.getTitle(),
                notes.getDescription(),
                notes.getUploadedBy().getId(),
                notes.getUploadedBy().getFirstName() + " " + notes.getUploadedBy().getLastName(),
                notes.getCreatedAt());
    }
}
