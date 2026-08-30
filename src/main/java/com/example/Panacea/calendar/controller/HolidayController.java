package com.example.Panacea.calendar.controller;

import com.example.Panacea.calendar.dto.HolidayRequest;
import com.example.Panacea.calendar.dto.HolidayResponse;
import com.example.Panacea.calendar.service.HolidayService;
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

/**
 * Institution-wide holiday CRUD. Create/edit/delete is ADMIN-only — HOD (and
 * every other role) only ever hits the GET endpoints, which have no
 * @PreAuthorize and so fall back to SecurityConfig's default
 * anyRequest().authenticated(), same as CourseController's reads.
 */
@RestController
@RequestMapping("/api/calendar/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService holidayService;

    @GetMapping
    public List<HolidayResponse> findAll() {
        return holidayService.findAll().stream().map(HolidayResponse::from).toList();
    }

    @GetMapping("/{id}")
    public HolidayResponse findById(@PathVariable Long id) {
        return HolidayResponse.from(holidayService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public HolidayResponse create(@Valid @RequestBody HolidayRequest request) {
        return HolidayResponse.from(holidayService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public HolidayResponse update(@PathVariable Long id, @Valid @RequestBody HolidayRequest request) {
        return HolidayResponse.from(holidayService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        holidayService.delete(id);
    }
}
