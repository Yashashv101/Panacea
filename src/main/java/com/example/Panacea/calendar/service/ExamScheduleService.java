package com.example.Panacea.calendar.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.calendar.dto.ExamScheduleRequest;
import com.example.Panacea.calendar.dto.ExamScheduleResponse;
import com.example.Panacea.calendar.entity.ExamSchedule;
import com.example.Panacea.calendar.repository.ExamScheduleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Returns ExamScheduleResponse (not the ExamSchedule entity) from every
 * read method — semester and semester.session are LAZY, so per CLAUDE.md's
 * DTO-mapping rule the mapping (which reads those associations) has to
 * happen in here, inside the transaction, not back in the controller.
 */
@Service
@RequiredArgsConstructor
public class ExamScheduleService {

    private final ExamScheduleRepository examScheduleRepository;
    private final SemesterRepository semesterRepository;
    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public List<ExamScheduleResponse> findAll() {
        return examScheduleRepository.findAll().stream().map(ExamScheduleResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ExamScheduleResponse findById(Long id) {
        return ExamScheduleResponse.from(findEntity(id));
    }

    @Transactional
    public ExamScheduleResponse create(ExamScheduleRequest request) {
        validateDateRange(request);
        ExamSchedule exam = ExamSchedule.builder()
                .startDate(request.startDate())
                .endDate(request.endDate())
                .name(request.name())
                .description(request.description())
                .semester(resolveSemester(request.semesterId()))
                .course(resolveCourse(request.courseId()))
                .build();
        return ExamScheduleResponse.from(examScheduleRepository.save(exam));
    }

    @Transactional
    public ExamScheduleResponse update(Long id, ExamScheduleRequest request) {
        validateDateRange(request);
        ExamSchedule exam = findEntity(id);
        exam.setStartDate(request.startDate());
        exam.setEndDate(request.endDate());
        exam.setName(request.name());
        exam.setDescription(request.description());
        exam.setSemester(resolveSemester(request.semesterId()));
        exam.setCourse(resolveCourse(request.courseId()));
        return ExamScheduleResponse.from(exam);
    }

    @Transactional
    public void delete(Long id) {
        if (!examScheduleRepository.existsById(id)) {
            throw new EntityNotFoundException("Exam schedule " + id + " not found");
        }
        examScheduleRepository.deleteById(id);
    }

    private void validateDateRange(ExamScheduleRequest request) {
        if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException("endDate cannot be before startDate");
        }
    }

    private ExamSchedule findEntity(Long id) {
        return examScheduleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Exam schedule " + id + " not found"));
    }

    private Semester resolveSemester(Long semesterId) {
        return semesterRepository.findById(semesterId)
                .orElseThrow(() -> new EntityNotFoundException("Semester " + semesterId + " not found"));
    }

    private Course resolveCourse(Long courseId) {
        if (courseId == null) {
            return null;
        }
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course " + courseId + " not found"));
    }
}
