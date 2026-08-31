package com.example.Panacea.academic.controller;

import com.example.Panacea.academic.dto.PreviousYearPaperResponse;
import com.example.Panacea.academic.service.PreviousYearPaperService;
import com.example.Panacea.identity.security.UserPrincipal;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PreviousYearPaperController {

    private final PreviousYearPaperService previousYearPaperService;

    @PostMapping(value = "/api/subjects/{subjectId}/previous-year-papers", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @ResponseStatus(HttpStatus.CREATED)
    public PreviousYearPaperResponse uploadPreviousYearPaper(@PathVariable Long subjectId,
                                                             @RequestParam("title") String title,
                                                             @RequestParam(value = "description", required = false) String description,
                                                             @RequestParam("file") MultipartFile file,
                                                             @AuthenticationPrincipal UserPrincipal principal) {
        return previousYearPaperService.uploadPreviousYearPaper(subjectId, title, description, file, principal.getUser());
    }

    @GetMapping("/api/subjects/{subjectId}/previous-year-papers")
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD', 'STAFF', 'STUDENT')")
    public List<PreviousYearPaperResponse> listBySubject(@PathVariable Long subjectId,
                                                         @AuthenticationPrincipal UserPrincipal principal) {
        return previousYearPaperService.findBySubject(subjectId, principal.getUser());
    }

    @GetMapping("/api/previous-year-papers/{id}/file")
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD', 'STAFF', 'STUDENT')")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        Resource resource = previousYearPaperService.downloadPreviousYearPaper(id, principal.getUser());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"pyq-" + id + ".pdf\"")
                .body(resource);
    }

    @DeleteMapping("/api/previous-year-papers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id,
                       @AuthenticationPrincipal UserPrincipal principal) {
        previousYearPaperService.deletePreviousYearPaper(id, principal.getUser());
    }
}
