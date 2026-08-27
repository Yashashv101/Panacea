package com.example.Panacea.academic.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.dto.CourseRequest;
import com.example.Panacea.academic.repository.CourseRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public List<Course> findAll() {
        return courseRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Course findById(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course " + id + " not found"));
    }

    @Transactional
    public Course create(CourseRequest request) {
        if (courseRepository.existsByNameIgnoreCase(request.name())) {
            throw new IllegalArgumentException("Course '" + request.name() + "' already exists");
        }
        return courseRepository.save(Course.builder().name(request.name()).build());
    }

    @Transactional
    public Course update(Long id, CourseRequest request) {
        Course course = findById(id);
        course.setName(request.name());
        return course;
    }

    @Transactional
    public void delete(Long id) {
        if (!courseRepository.existsById(id)) {
            throw new EntityNotFoundException("Course " + id + " not found");
        }
        courseRepository.deleteById(id);
    }
}
