package com.example.Panacea.academic.service;

import com.example.Panacea.academic.dto.StudyMaterialResponse;
import com.example.Panacea.academic.entity.StudyMaterial;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.StudyMaterialRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.academic.security.SubjectAccessGuard;
import com.example.Panacea.academic.security.SubjectOwnershipGuard;
import com.example.Panacea.identity.entity.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudyMaterialService {

    private final StudyMaterialRepository studyMaterialRepository;
    private final SubjectRepository subjectRepository;
    private final SubjectOwnershipGuard subjectOwnershipGuard;
    private final SubjectAccessGuard subjectAccessGuard;

    @Value("${panacea.study-material.upload-dir:uploads/study-materials}")
    private String uploadDir;

    @Transactional
    public StudyMaterialResponse uploadStudyMaterial(Long subjectId, String title, String description,
                                                     MultipartFile file, User caller) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equalsIgnoreCase("application/pdf")) {
            throw new IllegalArgumentException("Only PDF files are accepted");
        }

        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new EntityNotFoundException("Subject " + subjectId + " not found"));

        subjectOwnershipGuard.requireOwnership(caller, subject);

        try {
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);

            String filename = subjectId + "_" + UUID.randomUUID() + ".pdf";
            Path destination = dir.resolve(filename);

            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            StudyMaterial material = studyMaterialRepository.save(StudyMaterial.builder()
                    .subject(subject)
                    .title(title.trim())
                    .description(description != null && !description.isBlank() ? description.trim() : null)
                    .filePath(destination.toString())
                    .uploadedBy(caller)
                    .build());

            return StudyMaterialResponse.from(material);

        } catch (IOException e) {
            throw new RuntimeException("Failed to store study material file: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<StudyMaterialResponse> findBySubject(Long subjectId, User caller) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new EntityNotFoundException("Subject " + subjectId + " not found"));

        subjectAccessGuard.requireReadAccess(caller, subject);

        return studyMaterialRepository.findBySubjectIdOrderByCreatedAtDesc(subjectId).stream()
                .map(StudyMaterialResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Resource downloadStudyMaterial(Long id, User caller) {
        StudyMaterial material = studyMaterialRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Study material " + id + " not found"));

        subjectAccessGuard.requireReadAccess(caller, material.getSubject());

        try {
            Path file = Paths.get(material.getFilePath());
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new EntityNotFoundException("Study material file is missing on disk");
            }
            return resource;
        } catch (IOException e) {
            throw new RuntimeException("Failed to read study material file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void deleteStudyMaterial(Long id, User caller) {
        StudyMaterial material = studyMaterialRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Study material " + id + " not found"));

        subjectOwnershipGuard.requireOwnership(caller, material.getSubject());

        try {
            Files.deleteIfExists(Paths.get(material.getFilePath()));
        } catch (IOException ignored) {
        }

        studyMaterialRepository.delete(material);
    }
}
