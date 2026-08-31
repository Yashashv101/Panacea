package com.example.Panacea.academic.service;

import com.example.Panacea.academic.dto.ClassNotesResponse;
import com.example.Panacea.academic.entity.ClassNotes;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.ClassNotesRepository;
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
public class ClassNotesService {

    private final ClassNotesRepository classNotesRepository;
    private final SubjectRepository subjectRepository;
    private final SubjectOwnershipGuard subjectOwnershipGuard;
    private final SubjectAccessGuard subjectAccessGuard;

    @Value("${panacea.class-notes.upload-dir:uploads/class-notes}")
    private String uploadDir;

    @Transactional
    public ClassNotesResponse uploadClassNotes(Long subjectId, String title, String description,
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

            ClassNotes notes = classNotesRepository.save(ClassNotes.builder()
                    .subject(subject)
                    .title(title.trim())
                    .description(description != null && !description.isBlank() ? description.trim() : null)
                    .filePath(destination.toString())
                    .uploadedBy(caller)
                    .build());

            return ClassNotesResponse.from(notes);

        } catch (IOException e) {
            throw new RuntimeException("Failed to store class notes file: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<ClassNotesResponse> findBySubject(Long subjectId, User caller) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new EntityNotFoundException("Subject " + subjectId + " not found"));

        subjectAccessGuard.requireReadAccess(caller, subject);

        return classNotesRepository.findBySubjectIdOrderByCreatedAtDesc(subjectId).stream()
                .map(ClassNotesResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Resource downloadClassNotes(Long id, User caller) {
        ClassNotes notes = classNotesRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Class notes " + id + " not found"));

        subjectAccessGuard.requireReadAccess(caller, notes.getSubject());

        try {
            Path file = Paths.get(notes.getFilePath());
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new EntityNotFoundException("Class notes file is missing on disk");
            }
            return resource;
        } catch (IOException e) {
            throw new RuntimeException("Failed to read class notes file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void deleteClassNotes(Long id, User caller) {
        ClassNotes notes = classNotesRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Class notes " + id + " not found"));

        subjectOwnershipGuard.requireOwnership(caller, notes.getSubject());

        try {
            Files.deleteIfExists(Paths.get(notes.getFilePath()));
        } catch (IOException ignored) {
        }

        classNotesRepository.delete(notes);
    }
}
