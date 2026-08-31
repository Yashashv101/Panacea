package com.example.Panacea.academic.repository;

import com.example.Panacea.academic.entity.PreviousYearPaper;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PreviousYearPaperRepository extends JpaRepository<PreviousYearPaper, Long> {

    List<PreviousYearPaper> findBySubjectIdOrderByCreatedAtDesc(Long subjectId);
}
