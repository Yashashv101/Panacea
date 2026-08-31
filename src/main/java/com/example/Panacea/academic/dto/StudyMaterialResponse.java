package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.StudyMaterial;

import java.time.Instant;

public record StudyMaterialResponse(
        Long id,
        Long subjectId,
        String subjectName,
        String title,
        String description,
        Long uploadedById,
        String uploadedByName,
        Instant createdAt
) {
    public static StudyMaterialResponse from(StudyMaterial material) {
        return new StudyMaterialResponse(
                material.getId(),
                material.getSubject().getId(),
                material.getSubject().getName(),
                material.getTitle(),
                material.getDescription(),
                material.getUploadedBy().getId(),
                material.getUploadedBy().getFirstName() + " " + material.getUploadedBy().getLastName(),
                material.getCreatedAt());
    }
}
