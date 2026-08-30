package com.example.Panacea.calendar.controller;

import com.example.Panacea.calendar.dto.CalendarEntryResponse;
import com.example.Panacea.calendar.service.CalendarQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Student/staff-facing read endpoint: every upcoming Holiday, ExamSchedule,
 * and CollegeEvent merged into one date-sorted feed. No @PreAuthorize — any
 * authenticated role can read it (SecurityConfig's default), same as the
 * per-type GET endpoints.
 */
@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarQueryService calendarQueryService;

    @GetMapping("/upcoming")
    public List<CalendarEntryResponse> upcoming() {
        return calendarQueryService.findUpcoming();
    }
}
