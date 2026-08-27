package com.example.Panacea.academic.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.dto.SubjectRequest;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.academic.repository.SectionRepository;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.identity.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<Subject> findAll() {
        return subjectRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Subject findById(Long id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Subject " + id + " not found"));
    }

    @Transactional
    public Subject create(SubjectRequest request) {
        Subject subject = new Subject();
        apply(subject, request);
        return subjectRepository.save(subject);
    }

    @Transactional
    public Subject update(Long id, SubjectRequest request) {
        Subject subject = findById(id);
        apply(subject, request);
        return subject;
    }

    @Transactional
    public void delete(Long id) {
        if (!subjectRepository.existsById(id)) {
            throw new EntityNotFoundException("Subject " + id + " not found");
        }
        subjectRepository.deleteById(id);
    }

    private void apply(Subject subject, SubjectRequest request) {
        subject.setName(request.name());
        subject.setCredits(request.credits());
        subject.setSemester(semesterRepository.findById(request.semesterId())
                .orElseThrow(() -> new EntityNotFoundException("Semester " + request.semesterId() + " not found")));
        subject.setPrimaryStaff(resolvePrimaryStaff(request.primaryStaffId()));
        subject.setCourses(resolveCourses(request.courseIds()));
        subject.setSections(resolveSections(request.sectionIds()));
    }

    private User resolvePrimaryStaff(Long staffId) {
        if (staffId == null) {
            return null;
        }
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new EntityNotFoundException("User " + staffId + " not found"));
        if (staff.getRole() != Role.STAFF) {
            throw new IllegalArgumentException("User " + staffId + " is not a staff member");
        }
        return staff;
    }

    private Set<Course> resolveCourses(Set<Long> courseIds) {
        Set<Course> courses = new HashSet<>(courseRepository.findAllById(courseIds));
        if (courses.size() != courseIds.size()) {
            throw new EntityNotFoundException("One or more courses not found");
        }
        return courses;
    }

    private Set<Section> resolveSections(Set<Long> sectionIds) {
        Set<Section> sections = new HashSet<>(sectionRepository.findAllById(sectionIds));
        if (sections.size() != sectionIds.size()) {
            throw new EntityNotFoundException("One or more sections not found");
        }
        return sections;
    }
}
