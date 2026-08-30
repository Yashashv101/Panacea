package com.example.Panacea.calendar.repository;

import com.example.Panacea.calendar.entity.ExamSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, Long> {

    // COALESCE(endDate, startDate) so a single-day exam (endDate null) and an
    // in-progress multi-day window both count as "upcoming" until their last day.
    @Query("select e from ExamSchedule e where coalesce(e.endDate, e.startDate) >= :date order by e.startDate asc")
    List<ExamSchedule> findUpcoming(@Param("date") LocalDate date);
}
