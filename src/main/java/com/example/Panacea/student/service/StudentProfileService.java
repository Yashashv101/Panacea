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
import com.example.Panacea.attendance.repository.AttendanceReportRepository;
import com.example.Panacea.enrollment.entity.ElectiveEnrollmentRequest;
import com.example.Panacea.enrollment.entity.EnrollmentStatus;
import com.example.Panacea.enrollment.repository.ElectiveEnrollmentRequestRepository;
import com.example.Panacea.identity.dto.UserResponse;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.HodScopeResolver;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.results.entity.StudentResult;
import com.example.Panacea.results.repository.StudentResultRepository;
import com.example.Panacea.student.dto.AtRiskReason;
import com.example.Panacea.student.dto.AtRiskStudentResponse;
import com.example.Panacea.student.dto.StudentLookupResponse;
import com.example.Panacea.student.entity.StudentProfile;
import com.example.Panacea.student.repository.StudentProfileRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StudentProfileService {

    private final StudentProfileRepository studentProfileRepository;
    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final SemesterRepository semesterRepository;
    private final SubjectRepository subjectRepository;
    private final com.example.Panacea.academic.repository.SubjectStaffAssignmentRepository subjectStaffAssignmentRepository;
    private final ElectiveEnrollmentRequestRepository electiveEnrollmentRequestRepository;
    private final AttendanceReportRepository attendanceReportRepository;
    private final StudentResultRepository studentResultRepository;
    private final UserRepository userRepository;
    private final HodScopeResolver hodScopeResolver;


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
     * The nullable counterpart to getByUserId — used by HOD department-scoping
     * checks (LeaveService, FeedbackService) that need "does this STUDENT belong
     * to my course, or null if they have no profile yet" without treating a
     * missing profile as an error the way getByUserId does.
     */
    @Transactional(readOnly = true)
    public Long findCourseIdForUser(Long userId) {
        return studentProfileRepository.findByUserId(userId).map(p -> p.getCourse().getId()).orElse(null);
    }

    /**
     * The HOD-scoping counterpart to findStudentsInSection above — students
     * whose profile places them in this Course, used by UserService#listUsers
     * to filter the STUDENT roster down to an HOD's own department. Returns
     * User (not UserResponse) since the caller still needs to fold this into
     * a role-generic User list alongside the STAFF branch, so it can't map to
     * UserResponse here the way findStudentsInSection does. StudentProfile.user
     * is a LAZY proxy — merely obtaining the reference via getUser() inside
     * this transaction does NOT force initialization (CLAUDE.md's DTO-mapping
     * rule, the hard way: this shipped without the Hibernate.initialize call
     * below, and every existing test passed anyway, because MockMvc run
     * inside a @Transactional test method keeps the Hibernate session open
     * across what would, in production, be two separate transactions —
     * masking exactly this bug. A real request hit
     * UserController.listUsers's UserResponse::from mapping with the
     * session already closed and threw LazyInitializationException). The
     * explicit Hibernate.initialize(user) below forces the proxy to load
     * while the session is still open, which is what actually keeps this
     * safe.
     */
    @Transactional(readOnly = true)
    public List<User> findUsersInCourse(Long courseId) {
        return studentProfileRepository.findByCourseId(courseId).stream()
                .map(StudentProfile::getUser)
                .peek(Hibernate::initialize)
                .toList();
    }

    /**
     * The HOD/ADMIN "search a student by email" lookup behind
     * GET /api/students/by-email. Deliberately collapses "no such student"
     * and "that student exists but is outside your department" into the same
     * empty result — like the filter-list endpoints (not the reject-403
     * single-resource ones), since a distinct 403 here would let an HOD
     * enumerate valid student emails in departments they can't otherwise see.
     * ADMIN (or a null scope) always sees the match, if any.
     *
     * Maps to StudentLookupResponse here, inside the transaction, rather than
     * returning the StudentProfile for the controller to map — every field
     * StudentLookupResponse.from reads (profile.user, .course, .section,
     * .semester) is a LAZY reference, so mapping it after this method
     * returns would throw LazyInitializationException once the session
     * closes (CLAUDE.md's DTO-mapping rule — see findUsersInCourse's comment
     * above for how easily this slips past tests that run MockMvc inside a
     * @Transactional test method).
     */
    @Transactional(readOnly = true)
    public Optional<StudentLookupResponse> findByEmail(String email, UserPrincipal principal) {
        Optional<User> student = userRepository.findByEmail(email).filter(u -> u.getRole() == Role.STUDENT);
        if (student.isEmpty()) {
            return Optional.empty();
        }

        Optional<StudentProfile> profile = studentProfileRepository.findByUserId(student.get().getId());
        return hodScopeResolver.filterByHodScope(principal, profile.stream().toList(), p -> p.getCourse().getId())
                .stream()
                .findFirst()
                .map(StudentLookupResponse::from);
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
        Section section = profile.getSection();
        return subjectRepository.findByCoursesIdAndSemesterIdAndType(
                        profile.getCourse().getId(), profile.getSemester().getId(), SubjectType.CORE).stream()
                .map(subject -> SubjectResponse.from(subject, resolveAssignedStaff(subject, section)))
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
        StudentProfile profile = getByUserId(studentUserId);
        Section section = profile.getSection();
        return electiveEnrollmentRequestRepository
                .findByStudentIdAndStatus(studentUserId, EnrollmentStatus.APPROVED).stream()
                .map(request -> SubjectResponse.from(request.getSubject(), resolveAssignedStaff(request.getSubject(), section)))
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
        StudentProfile profile = getByUserId(studentUserId);
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new EntityNotFoundException("Subject " + subjectId + " not found"));
        requireSubjectAccessible(studentUserId, subjectId);
        return SubjectResponse.from(subject, resolveAssignedStaff(subject, profile.getSection()));
    }

    private User resolveAssignedStaff(Subject subject, Section section) {
        if (section == null) {
            return subject.getPrimaryStaff();
        }
        return subjectStaffAssignmentRepository.findBySubjectIdAndSectionId(subject.getId(), section.getId())
                .map(com.example.Panacea.academic.entity.SubjectStaffAssignment::getStaff)
                .orElse(subject.getPrimaryStaff());
    }

    /**
     * The HOD/ADMIN/STAFF endpoint for retrieving all enrolled subjects (core + approved electives)
     * for a given student ID. HOD callers are scoped to their own department (403 if student's course
     * does not match HOD's hodCourse).
     */
    @Transactional(readOnly = true)
    public List<SubjectResponse> findSubjectsForStudent(Long studentId, UserPrincipal principal) {
        StudentProfile profile = getByUserId(studentId);
        hodScopeResolver.requireCourseAccess(principal, profile.getCourse().getId());
        return findMySubjects(studentId);
    }

    /**
     * Computes the at-risk student list for the acting HOD's department.
     * Evaluates every student enrolled in the HOD's course across all their subjects
     * (core + approved electives) for two independent conditions:
     * 1. Attendance < 75% for that subject (evaluated only when sessions have been recorded)
     * 2. CIE Marks (test1 + test2) < 20 / 50 (evaluated only if a StudentResult row exists)
     */
    @Transactional(readOnly = true)
    public List<AtRiskStudentResponse> findAtRiskStudents(UserPrincipal principal) {
        Course course = hodScopeResolver.resolveScopeCourse(principal);
        if (course == null) {
            throw new AccessDeniedException("You are not scoped as an HOD to any course");
        }

        List<StudentProfile> profiles = studentProfileRepository.findByCourseId(course.getId());
        List<AtRiskStudentResponse> atRiskStudents = new ArrayList<>();

        // Cache core subjects by semesterId to avoid redundant queries across students in the same semester
        Map<Long, List<Subject>> coreSubjectsBySemester = new HashMap<>();

        for (StudentProfile profile : profiles) {
            User student = profile.getUser();
            Long semesterId = profile.getSemester().getId();

            List<Subject> coreSubjects = coreSubjectsBySemester.computeIfAbsent(semesterId, semId ->
                    subjectRepository.findByCoursesIdAndSemesterIdAndType(course.getId(), semId, SubjectType.CORE));

            List<Subject> approvedElectives = electiveEnrollmentRequestRepository
                    .findByStudentIdAndStatus(student.getId(), EnrollmentStatus.APPROVED)
                    .stream()
                    .map(ElectiveEnrollmentRequest::getSubject)
                    .toList();

            Map<Long, Subject> enrolledSubjects = new LinkedHashMap<>();
            coreSubjects.forEach(s -> enrolledSubjects.put(s.getId(), s));
            approvedElectives.forEach(s -> enrolledSubjects.putIfAbsent(s.getId(), s));

            List<AtRiskReason> reasons = new ArrayList<>();

            for (Subject subject : enrolledSubjects.values()) {
                // 1. Attendance condition: < 75% (evaluated only when sessions exist)
                long totalSessions = attendanceReportRepository.countByStudentIdAndSubjectId(student.getId(), subject.getId());
                if (totalSessions > 0) {
                    long presentSessions = attendanceReportRepository.countPresentByStudentIdAndSubjectId(student.getId(), subject.getId());
                    double percentage = (presentSessions * 100.0) / totalSessions;
                    if (percentage < 75.0) {
                        reasons.add(AtRiskReason.attendance(subject.getId(), subject.getName(), percentage, totalSessions, presentSessions));
                    }
                }

                // 2. Marks condition: test1 + test2 < 20 / 50 (evaluated only if StudentResult exists)
                Optional<StudentResult> resultOpt = studentResultRepository
                        .findByStudentIdAndSubjectIdAndSemesterId(student.getId(), subject.getId(), semesterId);
                if (resultOpt.isPresent()) {
                    StudentResult result = resultOpt.get();
                    if (result.getTest1() != null && result.getTest2() != null) {
                        double marksTotal = result.getTest1() + result.getTest2();
                        if (marksTotal < 20.0) {
                            reasons.add(AtRiskReason.marks(subject.getId(), subject.getName(), result.getTest1(), result.getTest2()));
                        }
                    }
                }
            }

            if (!reasons.isEmpty()) {
                atRiskStudents.add(new AtRiskStudentResponse(
                        student.getId(),
                        student.getFirstName() + " " + student.getLastName(),
                        student.getEmail(),
                        profile.getCourse().getName(),
                        profile.getSection().getName(),
                        profile.getSemester().getId(),
                        profile.getSemester().getLabel(),
                        reasons
                ));
            }
        }

        return atRiskStudents;
    }
}


