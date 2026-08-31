package com.example.Panacea.seed;

import com.example.Panacea.academic.dto.CourseRequest;
import com.example.Panacea.academic.dto.SectionRequest;
import com.example.Panacea.academic.dto.SectionResponse;
import com.example.Panacea.academic.dto.SubjectRequest;
import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.SubjectType;
import com.example.Panacea.academic.service.CourseService;
import com.example.Panacea.academic.service.SectionService;
import com.example.Panacea.academic.service.SemesterService;
import com.example.Panacea.academic.service.SubjectService;
import com.example.Panacea.fees.dto.CreateFeeStructureRequest;
import com.example.Panacea.fees.dto.FeeStructureResponse;
import com.example.Panacea.fees.entity.FeePayment;
import com.example.Panacea.fees.entity.PaymentStatus;
import com.example.Panacea.fees.repository.FeePaymentRepository;
import com.example.Panacea.fees.service.FeeStructureService;
import com.example.Panacea.identity.dto.CreateUserRequest;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.service.UserService;
import com.example.Panacea.session.dto.SessionRequest;
import com.example.Panacea.session.entity.Session;
import com.example.Panacea.session.service.SessionService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Full destructive reset + reseed of every table, for standing up a fresh
 * dev/demo dataset. Gated behind {@code panacea.seed.full-reset.enabled}
 * (blank/false by default, same style as AdminBootstrap's gate) so a normal
 * boot never wipes data — this is meant to be re-run on demand by setting
 * the flag, not to run every startup. Runs at @Order(0), before
 * SessionBootstrap(1) and AdminBootstrap(unordered/last), so those two still
 * find their own idempotent state absent (or present, if this seeder already
 * created it) once this method returns.
 * <p>
 * Table truncation uses a single {@code TRUNCATE ... CASCADE} statement
 * rather than hand-ordered deletes — Postgres resolves FK dependency order
 * for CASCADE itself, which is less error-prone than maintaining an ordered
 * list by hand as new tables get added.
 * <p>
 * Fee payments are written directly via {@link FeePaymentRepository} instead
 * of {@code FeePaymentService#initiate}, which calls the real Stripe
 * Checkout API — not viable here since no STRIPE_SECRET_KEY is configured
 * in this environment (it defaults to a placeholder key Stripe rejects).
 * Confirmed with the user before writing this: seed data bypasses Stripe
 * entirely rather than requiring a real test-mode key to be present.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@Order(0)
public class FullResetSeeder implements CommandLineRunner {

    private static final String SEEDED_PASSWORD = "ChangeMe@123";
    private static final BigDecimal TUITION_FEE_AMOUNT = new BigDecimal("45000.00");
    private static final BigDecimal EXAM_FEE_AMOUNT = new BigDecimal("5000.00");
    private static final int STAFF_COUNT = 5;
    private static final int STUDENTS_PER_SECTION = 10;

    private static final List<String> TABLES_IN_TRUNCATE_ORDER = List.of(
            "audit_logs", "attendance_reports", "attendances", "subject_courses", "subject_sections",
            "subject_staff_assignments",
            "quiz_question_options", "quiz_attempt_answers", "quiz_attempts", "quiz_questions", "quizzes",
            "student_results", "timetable_entries", "proctor_assignments", "elective_enrollment_requests",
            "leave_requests", "feedback", "notifications", "fee_payments", "fee_structures",
            "student_profiles", "subjects", "sections", "semesters", "courses", "users", "sessions");

    private record CourseSpec(String name, String code, int sectionCount) {
    }

    private record SubjectSpec(String courseCode, String name, int credits, SubjectType type) {
    }

    private static final List<CourseSpec> COURSE_SPECS = List.of(
            new CourseSpec("BE-CSE", "CSE", 4),
            new CourseSpec("BE-ISE", "ISE", 4),
            new CourseSpec("BE-AIML", "AIML", 2));

    private static final List<SubjectSpec> SUBJECT_SPECS = List.of(
            new SubjectSpec("CSE", "Parallel Computing", 4, SubjectType.CORE),
            new SubjectSpec("CSE", "CNS", 4, SubjectType.CORE),
            new SubjectSpec("CSE", "Total Quality Management", 3, SubjectType.ELECTIVE),
            new SubjectSpec("CSE", "NoSQL", 3, SubjectType.ELECTIVE),
            new SubjectSpec("ISE", "Software Testing and QA", 4, SubjectType.CORE),
            new SubjectSpec("ISE", "Distributed File System", 4, SubjectType.CORE),
            new SubjectSpec("ISE", "Big Data Analytics", 3, SubjectType.ELECTIVE),
            new SubjectSpec("ISE", "Electric Vehicles", 3, SubjectType.ELECTIVE),
            new SubjectSpec("AIML", "Computer Network", 4, SubjectType.CORE),
            new SubjectSpec("AIML", "Machine Learning", 4, SubjectType.CORE),
            new SubjectSpec("AIML", "Project Management", 3, SubjectType.ELECTIVE),
            new SubjectSpec("AIML", "Compiler Design", 3, SubjectType.ELECTIVE));

    // Last student of these sections is left with no FeePayment row at all —
    // the deliberate negative case for elective-request-on-unpaid-fees tests.
    // Spread 2/2/1 across CSE/ISE/AIML, roughly matching their section counts.
    private static final Set<String> UNPAID_SECTIONS = Set.of("CSE-A", "CSE-B", "ISE-A", "ISE-B", "AIML-A");

    private final EntityManager entityManager;
    private final SessionService sessionService;
    private final CourseService courseService;
    private final SectionService sectionService;
    private final SemesterService semesterService;
    private final SubjectService subjectService;
    private final com.example.Panacea.academic.service.SubjectStaffAssignmentService subjectStaffAssignmentService;
    private final UserService userService;
    private final FeeStructureService feeStructureService;
    private final FeePaymentRepository feePaymentRepository;

    @Value("${panacea.seed.full-reset.enabled:false}")
    private boolean fullResetEnabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!fullResetEnabled) {
            return;
        }

        log.warn("panacea.seed.full-reset.enabled=true — truncating every table and reseeding from scratch");
        truncateAllTables();

        Session session = seedSession();
        Semester semester = seedSemester(session);
        Map<String, Course> coursesByCode = seedCourses();
        seedHods(coursesByCode);
        Map<String, List<SectionResponse>> sectionsByCourseCode = seedSections(coursesByCode);
        Map<String, List<User>> staffByCourse = seedStaff(coursesByCode);
        int subjectCount = seedSubjects(coursesByCode, sectionsByCourseCode, semester, staffByCourse);
        StudentSeedResult students = seedStudents(coursesByCode, sectionsByCourseCode, semester);
        List<FeeStructureResponse> feeStructures = seedFeeStructures(coursesByCode, semester);
        int paidCount = seedFeePayments(students.all(), feeStructures);

        int totalStaffCount = staffByCourse.values().stream().mapToInt(List::size).sum();
        report(session, semester, coursesByCode.size(), sectionsByCourseCode, totalStaffCount, subjectCount,
                students.all().size(), feeStructures.size(), paidCount, students.unpaid());
    }

    private void truncateAllTables() {
        String sql = "TRUNCATE TABLE " + String.join(", ", TABLES_IN_TRUNCATE_ORDER) + " RESTART IDENTITY CASCADE";
        entityManager.createNativeQuery(sql).executeUpdate();
    }

    private Session seedSession() {
        // Matches SessionBootstrap's July-June academic year convention so the
        // Session this seeder creates is the same "current" one that bootstrap
        // would otherwise create on its own next.
        LocalDate start = LocalDate.of(2026, Month.JULY, 1);
        LocalDate end = LocalDate.of(2027, Month.JUNE, 30);
        return sessionService.create(new SessionRequest(start, end));
    }

    private Semester seedSemester(Session session) {
        // SessionService.create() (called by seedSession() above) already
        // auto-creates the full Semester 1..8 set for this session, so this
        // just looks up the one this seeder's cohort actually needs rather
        // than creating it again (which would now conflict).
        return semesterService.findBySessionAndNumber(session.getId(), 1);
    }

    private Map<String, Course> seedCourses() {
        Map<String, Course> byCode = new LinkedHashMap<>();
        for (CourseSpec spec : COURSE_SPECS) {
            byCode.put(spec.code(), courseService.create(new CourseRequest(spec.name())));
        }
        return byCode;
    }

    private void seedHods(Map<String, Course> coursesByCode) {
        for (Map.Entry<String, Course> entry : coursesByCode.entrySet()) {
            String code = entry.getKey();
            Course course = entry.getValue();
            userService.createUser(new CreateUserRequest(
                    ("hod." + code + "@panacea.edu").toLowerCase(), SEEDED_PASSWORD, "HOD", code,
                    Role.HOD, course.getId(), null, null));
        }
    }

    private Map<String, List<SectionResponse>> seedSections(Map<String, Course> coursesByCode) {
        Map<String, List<SectionResponse>> byCourseCode = new LinkedHashMap<>();
        String[] names = {"A", "B", "C", "D"};
        for (CourseSpec spec : COURSE_SPECS) {
            Course course = coursesByCode.get(spec.code());
            List<SectionResponse> sections = new ArrayList<>();
            for (int i = 0; i < spec.sectionCount(); i++) {
                sections.add(sectionService.create(new SectionRequest(names[i], course.getId())));
            }
            byCourseCode.put(spec.code(), sections);
        }
        return byCourseCode;
    }

    private Map<String, List<User>> seedStaff(Map<String, Course> coursesByCode) {
        Map<String, List<User>> staffByCourse = new LinkedHashMap<>();
        int globalIndex = 1;

        // CSE: 4 staff (staff1 .. staff4)
        Course cse = coursesByCode.get("CSE");
        List<User> cseStaff = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            cseStaff.add(userService.createUser(new CreateUserRequest(
                    "staff" + globalIndex + "@panacea.edu", SEEDED_PASSWORD, "Staff", "Member" + globalIndex,
                    Role.STAFF, cse.getId(), null, null)));
            globalIndex++;
        }
        staffByCourse.put("CSE", cseStaff);

        // ISE: 4 staff (staff5 .. staff8)
        Course ise = coursesByCode.get("ISE");
        List<User> iseStaff = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            iseStaff.add(userService.createUser(new CreateUserRequest(
                    "staff" + globalIndex + "@panacea.edu", SEEDED_PASSWORD, "Staff", "Member" + globalIndex,
                    Role.STAFF, ise.getId(), null, null)));
            globalIndex++;
        }
        staffByCourse.put("ISE", iseStaff);

        // AIML: 3 staff (staff9 .. staff11)
        Course aiml = coursesByCode.get("AIML");
        List<User> aimlStaff = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            aimlStaff.add(userService.createUser(new CreateUserRequest(
                    "staff" + globalIndex + "@panacea.edu", SEEDED_PASSWORD, "Staff", "Member" + globalIndex,
                    Role.STAFF, aiml.getId(), null, null)));
            globalIndex++;
        }
        staffByCourse.put("AIML", aimlStaff);

        return staffByCourse;
    }

    private int seedSubjects(Map<String, Course> coursesByCode, Map<String, List<SectionResponse>> sectionsByCourseCode,
                              Semester semester, Map<String, List<User>> staffByCourse) {
        for (SubjectSpec spec : SUBJECT_SPECS) {
            Course course = coursesByCode.get(spec.courseCode());
            List<SectionResponse> secList = sectionsByCourseCode.get(spec.courseCode());
            List<User> deptStaff = staffByCourse.get(spec.courseCode());
            Set<Long> sectionIds = secList.stream()
                    .map(SectionResponse::id)
                    .collect(java.util.stream.Collectors.toSet());

            User primaryStaff = deptStaff.get(0);
            if ("Parallel Computing".equals(spec.name()) || "Total Quality Management".equals(spec.name())) {
                primaryStaff = deptStaff.get(0);
            } else if ("CNS".equals(spec.name()) || "NoSQL".equals(spec.name())) {
                primaryStaff = deptStaff.get(2);
            } else if ("Software Testing and QA".equals(spec.name()) || "Big Data Analytics".equals(spec.name())) {
                primaryStaff = deptStaff.get(0);
            } else if ("Distributed File System".equals(spec.name()) || "Electric Vehicles".equals(spec.name())) {
                primaryStaff = deptStaff.get(2);
            } else if ("Computer Network".equals(spec.name()) || "Project Management".equals(spec.name())) {
                primaryStaff = deptStaff.get(0);
            } else if ("Compiler Design".equals(spec.name())) {
                primaryStaff = deptStaff.get(1);
            } else if ("Machine Learning".equals(spec.name())) {
                primaryStaff = deptStaff.get(2);
            }

            var subject = subjectService.create(new SubjectRequest(
                    spec.name(), spec.credits(), spec.type(), primaryStaff.getId(), semester.getId(),
                    Set.of(course.getId()), sectionIds));

            seedStaffAssignmentsForSubject(subject.id(), secList, deptStaff, spec.name());
        }
        return SUBJECT_SPECS.size();
    }

    private void seedStaffAssignmentsForSubject(Long subjectId, List<SectionResponse> sections, List<User> deptStaff, String name) {
        if (sections.size() == 4) {
            if ("Parallel Computing".equals(name) || "Software Testing and QA".equals(name)) {
                // 2 staff across 4 sections (2 + 2)
                User staffA = deptStaff.get(0);
                User staffB = deptStaff.get(1);
                assign(subjectId, staffA.getId(), Set.of(sections.get(0).id(), sections.get(1).id()));
                assign(subjectId, staffB.getId(), Set.of(sections.get(2).id(), sections.get(3).id()));
            } else if ("CNS".equals(name) || "Distributed File System".equals(name)) {
                // 1 staff covering all 4 sections
                User staffAll = deptStaff.get(2);
                assign(subjectId, staffAll.getId(), Set.of(sections.get(0).id(), sections.get(1).id(), sections.get(2).id(), sections.get(3).id()));
            } else if ("Total Quality Management".equals(name) || "Big Data Analytics".equals(name)) {
                // 3 staff across 4 sections (2 + 1 + 1)
                User staffA = deptStaff.get(0);
                User staffB = deptStaff.get(1);
                User staffC = deptStaff.get(3);
                assign(subjectId, staffA.getId(), Set.of(sections.get(0).id(), sections.get(1).id()));
                assign(subjectId, staffB.getId(), Set.of(sections.get(2).id()));
                assign(subjectId, staffC.getId(), Set.of(sections.get(3).id()));
            } else if ("NoSQL".equals(name) || "Electric Vehicles".equals(name)) {
                // 2 staff across 4 sections (2 + 2)
                User staffA = deptStaff.get(2);
                User staffB = deptStaff.get(3);
                assign(subjectId, staffA.getId(), Set.of(sections.get(0).id(), sections.get(1).id()));
                assign(subjectId, staffB.getId(), Set.of(sections.get(2).id(), sections.get(3).id()));
            }
        } else if (sections.size() == 2) {
            if ("Computer Network".equals(name)) {
                // 2 staff across 2 sections (1 + 1)
                User staffA = deptStaff.get(0);
                User staffB = deptStaff.get(1);
                assign(subjectId, staffA.getId(), Set.of(sections.get(0).id()));
                assign(subjectId, staffB.getId(), Set.of(sections.get(1).id()));
            } else if ("Machine Learning".equals(name)) {
                // 1 staff covering both sections
                User staffAll = deptStaff.get(2);
                assign(subjectId, staffAll.getId(), Set.of(sections.get(0).id(), sections.get(1).id()));
            } else if ("Project Management".equals(name)) {
                // 2 staff across 2 sections (1 + 1)
                User staffA = deptStaff.get(0);
                User staffB = deptStaff.get(2);
                assign(subjectId, staffA.getId(), Set.of(sections.get(0).id()));
                assign(subjectId, staffB.getId(), Set.of(sections.get(1).id()));
            } else if ("Compiler Design".equals(name)) {
                // 1 staff covering both sections
                User staffAll = deptStaff.get(1);
                assign(subjectId, staffAll.getId(), Set.of(sections.get(0).id(), sections.get(1).id()));
            }
        } else {
            assign(subjectId, deptStaff.get(0).getId(), sections.stream().map(SectionResponse::id).collect(java.util.stream.Collectors.toSet()));
        }
    }

    private void assign(Long subjectId, Long staffId, Set<Long> sectionIds) {
        subjectStaffAssignmentService.assignStaff(
                new com.example.Panacea.academic.dto.SubjectStaffAssignmentRequest(staffId, subjectId, sectionIds), staffId);
    }

    private record StudentSeedResult(List<StudentSeed> all, List<StudentSeed> unpaid) {
    }

    private record StudentSeed(User user, Course course, boolean paid) {
    }

    private StudentSeedResult seedStudents(Map<String, Course> coursesByCode,
                                            Map<String, List<SectionResponse>> sectionsByCourseCode,
                                            Semester semester) {
        List<StudentSeed> all = new ArrayList<>();
        List<StudentSeed> unpaid = new ArrayList<>();

        for (CourseSpec spec : COURSE_SPECS) {
            Course course = coursesByCode.get(spec.code());
            for (SectionResponse section : sectionsByCourseCode.get(spec.code())) {
                String sectionKey = spec.code() + "-" + section.name();
                for (int i = 1; i <= STUDENTS_PER_SECTION; i++) {
                    String suffix = String.format("%s-%s-%02d", spec.code(), section.name(), i);
                    User student = userService.createUser(new CreateUserRequest(
                            ("student." + suffix + "@panacea.edu").toLowerCase(),
                            SEEDED_PASSWORD, "Student", suffix, Role.STUDENT,
                            course.getId(), section.id(), semester.getId()));

                    boolean isUnpaid = UNPAID_SECTIONS.contains(sectionKey) && i == STUDENTS_PER_SECTION;
                    StudentSeed seed = new StudentSeed(student, course, !isUnpaid);
                    all.add(seed);
                    if (isUnpaid) {
                        unpaid.add(seed);
                    }
                }
            }
        }
        return new StudentSeedResult(all, unpaid);
    }

    private List<FeeStructureResponse> seedFeeStructures(Map<String, Course> coursesByCode, Semester semester) {
        List<FeeStructureResponse> structures = new ArrayList<>();
        for (CourseSpec spec : COURSE_SPECS) {
            Course course = coursesByCode.get(spec.code());
            structures.add(feeStructureService.create(
                    new CreateFeeStructureRequest(course.getId(), semester.getId(), TUITION_FEE_AMOUNT, EXAM_FEE_AMOUNT)));
        }
        return structures;
    }

    /**
     * Writes PAID FeePayment rows directly, bypassing FeePaymentService#initiate
     * (real Stripe call — see class Javadoc). The 5 unpaid students simply get no
     * row, chosen over a PENDING row as the more accurate representation of
     * "hasn't paid yet" versus "started paying but never confirmed."
     */
    private int seedFeePayments(List<StudentSeed> students, List<FeeStructureResponse> feeStructures) {
        Map<Long, BigDecimal> amountByCourseId = new HashMap<>();
        for (FeeStructureResponse structure : feeStructures) {
            amountByCourseId.put(structure.courseId(), structure.totalAmount());
        }

        Semester semesterRef = entityManager.getReference(Semester.class,
                feeStructures.get(0).semesterId());

        int paidCount = 0;
        for (StudentSeed seed : students) {
            if (!seed.paid()) {
                continue;
            }
            FeePayment payment = FeePayment.builder()
                    .student(seed.user())
                    .course(seed.course())
                    .semester(semesterRef)
                    .amount(amountByCourseId.get(seed.course().getId()))
                    .status(PaymentStatus.PAID)
                    .idempotencyKey("SEED-" + seed.user().getId())
                    .paymentReference("full-reset-seed")
                    .build();
            feePaymentRepository.save(payment);
            paidCount++;
        }
        return paidCount;
    }

    private void report(Session session, Semester semester, int courseCount,
                         Map<String, List<SectionResponse>> sectionsByCourseCode, int staffCount, int subjectCount,
                         int studentCount, int feeStructureCount, int paidCount, List<StudentSeed> unpaid) {
        int sectionCount = sectionsByCourseCode.values().stream().mapToInt(List::size).sum();

        log.info("Full reset seed complete:");
        log.info("  Session: 1 ({} - {})", session.getStartYear(), session.getEndYear());
        log.info("  Semester: 1 ({})", semester.getLabel());
        log.info("  Courses: {}", courseCount);
        log.info("  Sections: {}", sectionCount);
        log.info("  Staff: {}", staffCount);
        log.info("  Subjects: {}", subjectCount);
        log.info("  Students: {}", studentCount);
        log.info("  Fee structures: {}", feeStructureCount);
        log.info("  Fee payments (PAID): {}", paidCount);
        log.info("  Students left with NO fee payment (negative test case): {}", unpaid.size());
        for (StudentSeed seed : unpaid) {
            log.info("    {} {} <{}>", seed.user().getFirstName(), seed.user().getLastName(), seed.user().getEmail());
        }
    }
}
