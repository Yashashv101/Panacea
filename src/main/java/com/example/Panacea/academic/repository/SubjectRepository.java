package com.example.Panacea.academic.repository;

import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.entity.SubjectType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Long> {

    List<Subject> findBySemesterIdAndSectionsId(Long semesterId, Long sectionId);

    List<Subject> findBySemesterIdAndType(Long semesterId, SubjectType type);

    List<Subject> findByCoursesIdAndSemesterIdAndType(Long courseId, Long semesterId, SubjectType type);

    /**
     * All subjects linked to a given course (via subject_courses join table).
     * Used by the HOD subjects view to show the department's full subject catalogue.
     */
    List<Subject> findByCoursesId(Long courseId);
}
