package com.example.Panacea.student.repository;

import com.example.Panacea.student.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {

    Optional<StudentProfile> findByUserId(Long userId);

    List<StudentProfile> findBySectionId(Long sectionId);

    List<StudentProfile> findByCourseId(Long courseId);
}
