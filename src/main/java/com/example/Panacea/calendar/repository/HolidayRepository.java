package com.example.Panacea.calendar.repository;

import com.example.Panacea.calendar.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    List<Holiday> findByDateGreaterThanEqualOrderByDateAsc(LocalDate date);
}
