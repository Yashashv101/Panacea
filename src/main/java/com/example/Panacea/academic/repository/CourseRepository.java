package com.example.Panacea.academic.repository;

import com.example.Panacea.academic.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Course> findByNameIgnoreCase(String name);
}
