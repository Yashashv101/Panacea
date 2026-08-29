package com.example.Panacea.student.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.academic.repository.SectionRepository;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.student.entity.StudentProfile;
import com.example.Panacea.student.repository.StudentProfileRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StudentProfileService {

    private final StudentProfileRepository studentProfileRepository;
    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final SemesterRepository semesterRepository;

    /**
     * The server-side lookup call sites use to resolve an authenticated
     * student's semester (and course/section) instead of trusting a
     * caller-supplied parameter. Throws a specific, clear error — not a
     * generic 500 or an empty result — when the STUDENT user has no profile
     * row yet, which is a valid, distinct state for a student an admin
     * hasn't finished setting up.
     */
    @Transactional(readOnly = true)
    public StudentProfile getByUserId(Long userId) {
        return studentProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Your enrollment isn't set up yet — ask an administrator to assign your course, "
                                + "section and semester"));
    }

    /**
     * Creates the student's profile row if none exists yet, or updates the
     * existing one otherwise — the single entry point both UserService#createUser
     * and UserService#updateUser call for a STUDENT-role user. Not applicable to
     * ADMIN/STAFF users, who simply have no row in this table.
     */
    @Transactional
    public StudentProfile createOrUpdate(User student, Long courseId, Long sectionId, Long semesterId) {
        if (student.getRole() != Role.STUDENT) {
            throw new IllegalArgumentException("User " + student.getId() + " is not a STUDENT");
        }
        if (courseId == null || sectionId == null || semesterId == null) {
            throw new IllegalArgumentException(
                    "course, section and semester are required for a STUDENT user");
        }

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course " + courseId + " not found"));
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new EntityNotFoundException("Section " + sectionId + " not found"));
        Semester semester = semesterRepository.findById(semesterId)
                .orElseThrow(() -> new EntityNotFoundException("Semester " + semesterId + " not found"));

        StudentProfile profile = studentProfileRepository.findByUserId(student.getId())
                .orElseGet(() -> StudentProfile.builder().user(student).build());
        profile.setCourse(course);
        profile.setSection(section);
        profile.setSemester(semester);

        return studentProfileRepository.save(profile);
    }
}
