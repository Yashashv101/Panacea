package com.example.Panacea.calendar.repository;

import com.example.Panacea.calendar.entity.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    List<Reminder> findByUserIdOrderByDateAscCreatedAtAsc(Long userId);

    List<Reminder> findByUserIdAndDateOrderByCreatedAtAsc(Long userId, LocalDate date);

    List<Reminder> findByUserIdAndDateBetweenOrderByDateAscCreatedAtAsc(Long userId, LocalDate start, LocalDate end);
}
