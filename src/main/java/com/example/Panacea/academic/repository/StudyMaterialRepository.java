package com.example.Panacea.academic.repository;

import com.example.Panacea.academic.entity.StudyMaterial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudyMaterialRepository extends JpaRepository<StudyMaterial, Long> {

    List<StudyMaterial> findBySubjectIdOrderByCreatedAtDesc(Long subjectId);
}
