package com.example.Panacea.calendar.repository;

import com.example.Panacea.calendar.entity.CollegeEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface CollegeEventRepository extends JpaRepository<CollegeEvent, Long> {

    List<CollegeEvent> findByDateGreaterThanEqualOrderByDateAsc(LocalDate date);
}
