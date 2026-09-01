package com.example.Panacea.calendar.service;

import com.example.Panacea.calendar.dto.CalendarEntryResponse;
import com.example.Panacea.calendar.repository.CollegeEventRepository;
import com.example.Panacea.calendar.repository.ExamScheduleRepository;
import com.example.Panacea.calendar.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * Read-only aggregation of the three calendar entities into one sorted feed
 * for the student/staff-facing "what's coming up" endpoint. Not a
 * department-scoped view: Holiday and CollegeEvent are institution-wide by
 * design, and an ExamSchedule with a null course already means "everyone" —
 * a course-scoped ExamSchedule row still shows up here for every viewer,
 * same as the ADMIN list, since narrowing "upcoming" to the viewer's own
 * department isn't part of this feature's brief.
 */
@Service
@RequiredArgsConstructor
public class CalendarQueryService {

    private final HolidayRepository holidayRepository;
    private final ExamScheduleRepository examScheduleRepository;
    private final CollegeEventRepository collegeEventRepository;

    @Transactional(readOnly = true)
    public List<CalendarEntryResponse> findUpcoming() {
        LocalDate today = LocalDate.now();
        return Stream.of(
                        holidayRepository.findByDateGreaterThanEqualOrderByDateAsc(today).stream()
                                .map(CalendarEntryResponse::from),
                        examScheduleRepository.findUpcoming(today).stream()
                                .map(CalendarEntryResponse::from),
                        collegeEventRepository.findByDateGreaterThanEqualOrderByDateAsc(today).stream()
                                .map(CalendarEntryResponse::from))
                .flatMap(s -> s)
                .sorted(Comparator.comparing(CalendarEntryResponse::date))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CalendarEntryResponse> findAll() {
        return Stream.of(
                        holidayRepository.findAll().stream()
                                .map(CalendarEntryResponse::from),
                        examScheduleRepository.findAll().stream()
                                .map(CalendarEntryResponse::from),
                        collegeEventRepository.findAll().stream()
                                .map(CalendarEntryResponse::from))
                .flatMap(s -> s)
                .sorted(Comparator.comparing(CalendarEntryResponse::date))
                .toList();
    }
}
