package com.example.Panacea.academic.repository;

import com.example.Panacea.academic.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubjectRepository extends JpaRepository<Subject, Long> {

    List<Subject> findBySemesterIdAndSectionsId(Long semesterId, Long sectionId);

    Optional<Subject> findByNameIgnoreCaseAndSemesterId(String name, Long semesterId);
}
