package com.example.Panacea.academic.controller;

import com.example.Panacea.academic.service.SemesterService;
import com.example.Panacea.academic.dto.SemesterRequest;
import com.example.Panacea.academic.dto.SemesterResponse;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/semesters")
@RequiredArgsConstructor
public class SemesterController {

    private final SemesterService semesterService;

    @GetMapping
    public List<SemesterResponse> findAll() {
        return semesterService.findAll().stream().map(SemesterResponse::from).toList();
    }

    @GetMapping("/{id}")
    public SemesterResponse findById(@PathVariable Long id) {
        return SemesterResponse.from(semesterService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public SemesterResponse create(@Valid @RequestBody SemesterRequest request) {
        return SemesterResponse.from(semesterService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public SemesterResponse update(@PathVariable Long id, @Valid @RequestBody SemesterRequest request) {
        return SemesterResponse.from(semesterService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        semesterService.delete(id);
    }
}
