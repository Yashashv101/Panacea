package com.example.Panacea.timetable.repository;

import com.example.Panacea.timetable.entity.TimetableEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Long> {

    List<TimetableEntry> findBySectionIdOrderByDayAscPeriodAsc(Long sectionId);

    List<TimetableEntry> findByStaffIdOrderByDayAscPeriodAsc(Long staffId);
}
