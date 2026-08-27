package com.example.Panacea.results.repository;

import com.example.Panacea.results.entity.StudentResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentResultRepository extends JpaRepository<StudentResult, Long> {

    Optional<StudentResult> findByStudentIdAndSubjectIdAndSemesterId(Long studentId, Long subjectId, Long semesterId);

    List<StudentResult> findByStudentIdOrderBySemesterIdAsc(Long studentId);
}
