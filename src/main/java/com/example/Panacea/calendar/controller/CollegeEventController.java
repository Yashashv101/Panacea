package com.example.Panacea.calendar.controller;

import com.example.Panacea.calendar.dto.CollegeEventRequest;
import com.example.Panacea.calendar.dto.CollegeEventResponse;
import com.example.Panacea.calendar.service.CollegeEventService;
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
@RequestMapping("/api/calendar/events")
@RequiredArgsConstructor
public class CollegeEventController {

    private final CollegeEventService collegeEventService;

    @GetMapping
    public List<CollegeEventResponse> findAll() {
        return collegeEventService.findAll().stream().map(CollegeEventResponse::from).toList();
    }

    @GetMapping("/{id}")
    public CollegeEventResponse findById(@PathVariable Long id) {
        return CollegeEventResponse.from(collegeEventService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public CollegeEventResponse create(@Valid @RequestBody CollegeEventRequest request) {
        return CollegeEventResponse.from(collegeEventService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CollegeEventResponse update(@PathVariable Long id, @Valid @RequestBody CollegeEventRequest request) {
        return CollegeEventResponse.from(collegeEventService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        collegeEventService.delete(id);
    }
}
