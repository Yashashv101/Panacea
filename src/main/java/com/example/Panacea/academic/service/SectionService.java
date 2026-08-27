package com.example.Panacea.academic.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.dto.SectionRequest;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.academic.repository.SectionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SectionService {

    private final SectionRepository sectionRepository;
    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public List<Section> findAll() {
        return sectionRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Section findById(Long id) {
        return sectionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Section " + id + " not found"));
    }

    @Transactional
    public Section create(SectionRequest request) {
        Course course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Course " + request.courseId() + " not found"));

        if (sectionRepository.existsByCourseIdAndNameIgnoreCase(course.getId(), request.name())) {
            throw new IllegalArgumentException(
                    "Section '" + request.name() + "' already exists for course " + course.getName());
        }

        return sectionRepository.save(Section.builder()
                .name(request.name())
                .course(course)
                .build());
    }

    @Transactional
    public Section update(Long id, SectionRequest request) {
        Section section = findById(id);
        Course course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Course " + request.courseId() + " not found"));

        if (!section.getName().equalsIgnoreCase(request.name())
                && sectionRepository.existsByCourseIdAndNameIgnoreCase(course.getId(), request.name())) {
            throw new IllegalArgumentException(
                    "Section '" + request.name() + "' already exists for course " + course.getName());
        }

        section.setName(request.name());
        section.setCourse(course);
        return section;
    }

    @Transactional
    public void delete(Long id) {
        if (!sectionRepository.existsById(id)) {
            throw new EntityNotFoundException("Section " + id + " not found");
        }
        sectionRepository.deleteById(id);
    }
}
