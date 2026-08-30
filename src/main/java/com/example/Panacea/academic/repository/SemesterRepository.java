package com.example.Panacea.academic.repository;

import com.example.Panacea.academic.entity.Semester;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SemesterRepository extends JpaRepository<Semester, Long> {

    boolean existsBySessionIdAndNumber(Long sessionId, Integer number);

    boolean existsBySessionId(Long sessionId);

    Optional<Semester> findBySessionIdAndNumber(Long sessionId, Integer number);
}
