package com.example.Panacea.session.repository;

import com.example.Panacea.session.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {

    boolean existsByStartYearAndEndYear(LocalDate startYear, LocalDate endYear);

    Optional<Session> findByStartYearAndEndYear(LocalDate startYear, LocalDate endYear);
}
