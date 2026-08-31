package com.example.Panacea.academic.service;

import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.academic.security.SubjectAccessGuard;
import com.example.Panacea.academic.security.SubjectOwnershipGuard;
import com.example.Panacea.identity.entity.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Upload and download of per-subject syllabus PDFs.
 *
 * <p><b>Upload</b> (ADMIN or subject's primaryStaff): stores the file at
 * {@code uploadDir}/{subjectId}_{uuid}.pdf, replacing any previously stored
 * file for this subject.
 *
 * <p><b>Download access rules</b>: delegates to {@link SubjectAccessGuard}.
 */
@Service
@RequiredArgsConstructor
public class SyllabusService {

    private final SubjectRepository subjectRepository;
    private final SubjectOwnershipGuard subjectOwnershipGuard;
    private final SubjectAccessGuard subjectAccessGuard;

    @Value("${panacea.syllabus.upload-dir:uploads/syllabi}")
    private String uploadDir;

    // ── Upload ────────────────────────────────────────────────────────────────

    /**
     * Stores the uploaded PDF for {@code subjectId}. Only ADMIN or the subject's
     * owning primaryStaff are authorized.
     */
    @Transactional
    public void uploadSyllabus(Long subjectId, MultipartFile file, User caller) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equalsIgnoreCase("application/pdf")) {
            throw new IllegalArgumentException("Only PDF files are accepted");
        }

        Subject subject = findSubjectOrThrow(subjectId);
        subjectOwnershipGuard.requireOwnership(caller, subject);

        try {
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);

            String filename = subjectId + "_" + UUID.randomUUID() + ".pdf";
            Path destination = dir.resolve(filename);

            String oldPath = subject.getSyllabusPath();
            if (oldPath != null) {
                try {
                    Files.deleteIfExists(Paths.get(oldPath));
                } catch (IOException ignored) {
                    // Old file cleanup is best-effort; the new path is authoritative.
                }
            }

            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            subject.setSyllabusPath(destination.toString());

        } catch (IOException e) {
            throw new RuntimeException("Failed to store syllabus file: " + e.getMessage(), e);
        }
    }

    // ── Download ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Resource downloadSyllabus(Long subjectId, User caller) {
        Subject subject = findSubjectOrThrow(subjectId);

        if (subject.getSyllabusPath() == null) {
            throw new EntityNotFoundException("No syllabus has been uploaded for subject " + subjectId);
        }

        subjectAccessGuard.requireReadAccess(caller, subject);

        try {
            Path file = Paths.get(subject.getSyllabusPath());
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new EntityNotFoundException("Syllabus file is not available (path on record but file missing)");
            }
            return resource;
        } catch (IOException e) {
            throw new RuntimeException("Failed to read syllabus file: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public boolean hasSyllabus(Long subjectId) {
        return subjectRepository.findById(subjectId)
                .map(s -> s.getSyllabusPath() != null)
                .orElse(false);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private Subject findSubjectOrThrow(Long subjectId) {
        return subjectRepository.findById(subjectId)
                .orElseThrow(() -> new EntityNotFoundException("Subject " + subjectId + " not found"));
    }
}
