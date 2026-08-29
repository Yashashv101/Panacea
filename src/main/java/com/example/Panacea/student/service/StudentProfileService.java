package com.example.Panacea.student.service;

import com.example.Panacea.academic.dto.SubjectResponse;
import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.SubjectType;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.academic.repository.SectionRepository;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.enrollment.entity.EnrollmentStatus;
import com.example.Panacea.enrollment.repository.ElectiveEnrollmentRequestRepository;
import com.example.Panacea.identity.dto.UserResponse;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.student.entity.StudentProfile;
import com.example.Panacea.student.repository.StudentProfileRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StudentProfileService {

    private final StudentProfileRepository studentProfileRepository;
    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final SemesterRepository semesterRepository;
    private final SubjectRepository subjectRepository;
    private final ElectiveEnrollmentRequestRepository electiveEnrollmentRequestRepository;

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

    /**
     * The roster Mark Attendance / Enter Results now use instead of "every
     * STUDENT user" — students whose profile places them in this section. A
     * STUDENT with no profile row simply never appears here: there's no row
     * to match, so no special-casing is needed for the 4 unlinked students.
     * Maps to UserResponse here, inside the transaction — StudentProfile.user
     * is a lazy proxy, and returning it as-is for the controller to map would
     * throw LazyInitializationException once the session closes (CLAUDE.md's
     * DTO-mapping rule, the hard way).
     */
    @Transactional(readOnly = true)
    public List<UserResponse> findStudentsInSection(Long sectionId) {
        return studentProfileRepository.findBySectionId(sectionId).stream()
                .map(profile -> UserResponse.from(profile.getUser()))
                .toList();
    }

    /**
     * A student's core subjects, derived from their profile's course + semester
     * via Subject.courses — NOT section. Core/elective subjects are the same
     * across every section of a course; section only ever determines which
     * physical group of students a staff member is looking at for a given
     * class period (see findStudentsInSection), never which subjects exist for
     * a student. This is what a "your subjects" view (student dashboard,
     * elective listing) can build on next; not wired to either this session,
     * per scope.
     */
    @Transactional(readOnly = true)
    public List<SubjectResponse> findCoreSubjects(Long studentUserId) {
        StudentProfile profile = getByUserId(studentUserId);
        return subjectRepository.findByCoursesIdAndSemesterIdAndType(
                        profile.getCourse().getId(), profile.getSemester().getId(), SubjectType.CORE).stream()
                .map(SubjectResponse::from)
                .toList();
    }

    /**
     * The elective counterpart to {@link #findCoreSubjects}: subjects the student has an
     * APPROVED {@code ElectiveEnrollmentRequest} for, regardless of which semester that
     * request was filed against — an approved elective stays visible to the student even
     * after the semester rolls forward, same as a core subject would.
     */
    @Transactional(readOnly = true)
    public List<SubjectResponse> findApprovedElectiveSubjects(Long studentUserId) {
        return electiveEnrollmentRequestRepository
                .findByStudentIdAndStatus(studentUserId, EnrollmentStatus.APPROVED).stream()
                .map(request -> SubjectResponse.from(request.getSubject()))
                .toList();
    }

    /**
     * The combined "your subjects" list a student dashboard renders — core subjects plus
     * approved electives, deduplicated by subject id (a subject could in principle appear
     * in both lists if it's core for the student's course/semester and they also hold an
     * approved elective request for it). Order is core-first, then electives, matching
     * insertion order of a LinkedHashMap rather than re-sorting.
     */
    @Transactional(readOnly = true)
    public List<SubjectResponse> findMySubjects(Long studentUserId) {
        Map<Long, SubjectResponse> byId = new LinkedHashMap<>();
        findCoreSubjects(studentUserId).forEach(s -> byId.put(s.id(), s));
        findApprovedElectiveSubjects(studentUserId).forEach(s -> byId.putIfAbsent(s.id(), s));
        return List.copyOf(byId.values());
    }

    /**
     * True only for a subject that's actually the student's — core for their course +
     * semester, or an approved elective request. This is the server-side check a
     * subject-detail view must pass before returning any per-subject data (attendance
     * history, etc.); it exists so guessing a subjectId in the URL can't expose another
     * student's data, mirroring the STAFF-side ownership guard in ResultService.
     */
    @Transactional(readOnly = true)
    public boolean isSubjectAccessible(Long studentUserId, Long subjectId) {
        boolean isCore = findCoreSubjects(studentUserId).stream()
                .anyMatch(subject -> subject.id().equals(subjectId));
        if (isCore) {
            return true;
        }
        return electiveEnrollmentRequestRepository
                .existsByStudentIdAndSubjectIdAndStatus(studentUserId, subjectId, EnrollmentStatus.APPROVED);
    }

    @Transactional(readOnly = true)
    public void requireSubjectAccessible(Long studentUserId, Long subjectId) {
        if (!isSubjectAccessible(studentUserId, subjectId)) {
            throw new AccessDeniedException("This subject isn't yours to view");
        }
    }

    /**
     * Backs the SubjectDetail page's initial load — resolves and guards in one call so
     * the page can neither render for a subject the student can't view nor leak the
     * distinction between "doesn't exist" and "not yours" beyond the 404 vs 403 status.
     */
    @Transactional(readOnly = true)
    public SubjectResponse getAccessibleSubject(Long studentUserId, Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new EntityNotFoundException("Subject " + subjectId + " not found"));
        requireSubjectAccessible(studentUserId, subjectId);
        return SubjectResponse.from(subject);
    }
}
