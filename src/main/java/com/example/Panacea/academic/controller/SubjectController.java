package com.example.Panacea.academic.controller;

import com.example.Panacea.academic.service.SubjectService;
import com.example.Panacea.academic.dto.SubjectRequest;
import com.example.Panacea.academic.dto.SubjectResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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

import java.util.List;

@RestController
@RequestMapping("/api/subjects")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;

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
}
