package com.example.Panacea.academic.repository;

import com.example.Panacea.academic.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SectionRepository extends JpaRepository<Section, Long> {

    boolean existsByCourseIdAndNameIgnoreCase(Long courseId, String name);

    Optional<Section> findByCourseIdAndNameIgnoreCase(Long courseId, String name);

    List<Section> findByCourseId(Long courseId);
}
