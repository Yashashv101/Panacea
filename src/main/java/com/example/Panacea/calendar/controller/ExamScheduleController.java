package com.example.Panacea.calendar.controller;

import com.example.Panacea.calendar.dto.ExamScheduleRequest;
import com.example.Panacea.calendar.dto.ExamScheduleResponse;
import com.example.Panacea.calendar.service.ExamScheduleService;
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
@RequestMapping("/api/calendar/exams")
@RequiredArgsConstructor
public class ExamScheduleController {

    private final ExamScheduleService examScheduleService;

    @GetMapping
    public List<ExamScheduleResponse> findAll() {
        return examScheduleService.findAll();
    }

    @GetMapping("/{id}")
    public ExamScheduleResponse findById(@PathVariable Long id) {
        return examScheduleService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ExamScheduleResponse create(@Valid @RequestBody ExamScheduleRequest request) {
        return examScheduleService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ExamScheduleResponse update(@PathVariable Long id, @Valid @RequestBody ExamScheduleRequest request) {
        return examScheduleService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        examScheduleService.delete(id);
    }
}
