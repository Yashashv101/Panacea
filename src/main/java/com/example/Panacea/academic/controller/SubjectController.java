package com.example.Panacea.academic.controller;

import com.example.Panacea.academic.service.SubjectService;
import com.example.Panacea.academic.service.SyllabusService;
import com.example.Panacea.academic.dto.SubjectRequest;
import com.example.Panacea.academic.dto.SubjectResponse;
import com.example.Panacea.identity.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/subjects")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;
    private final SyllabusService syllabusService;

    /**
     * Returns subjects optionally filtered by courseId.
     * ADMIN sees all; HOD uses ?courseId= to scope to their own department.
     * No role restriction here — the caller supplies the course scope;
     * HOD security is enforced by the dashboard page which reads the HOD's
     * own hodCourseId from their JWT context before making the request.
     */
    @GetMapping
    public List<SubjectResponse> findAll(@RequestParam(required = false) Long courseId) {
        if (courseId != null) {
            return subjectService.findByCourseId(courseId);
        }
        return subjectService.findAll();
    }

    @GetMapping("/{id}")
    public SubjectResponse findById(@PathVariable Long id) {
        return subjectService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public SubjectResponse create(@Valid @RequestBody SubjectRequest request) {
        return subjectService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public SubjectResponse update(@PathVariable Long id, @Valid @RequestBody SubjectRequest request) {
        return subjectService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        subjectService.delete(id);
    }

    // ── Syllabus upload / download ────────────────────────────────────────────

    /**
     * ADMIN or owning STAFF: upload (or replace) a syllabus PDF for the given subject.
     * Re-uploading replaces the existing file and updates the path on the Subject.
     */
    @PostMapping(value = "/{id}/syllabus", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void uploadSyllabus(@PathVariable Long id,
                               @RequestParam("file") MultipartFile file,
                               @AuthenticationPrincipal UserPrincipal principal) {
        syllabusService.uploadSyllabus(id, file, principal.getUser());
    }

    /**
     * HOD/STAFF/STUDENT: download the syllabus PDF for a subject they have access to.
     * Access rules: HOD → subject in their dept; STAFF → any authenticated staff;
     * STUDENT → subject is their enrolled core or approved elective.
     * Returns 404 if no syllabus has been uploaded; 403 if the caller lacks access.
     */
    @GetMapping("/{id}/syllabus")
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD', 'STAFF', 'STUDENT')")
    public ResponseEntity<Resource> downloadSyllabus(@PathVariable Long id,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        Resource resource = syllabusService.downloadSyllabus(id, principal.getUser());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"syllabus-" + id + ".pdf\"")
                .body(resource);
    }
}
