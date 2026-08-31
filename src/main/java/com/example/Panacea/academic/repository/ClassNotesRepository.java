package com.example.Panacea.academic.repository;

import com.example.Panacea.academic.entity.ClassNotes;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClassNotesRepository extends JpaRepository<ClassNotes, Long> {

    List<ClassNotes> findBySubjectIdOrderByCreatedAtDesc(Long subjectId);
}
