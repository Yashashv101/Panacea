package com.example.Panacea.devdata;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.academic.repository.SectionRepository;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.attendance.entity.Attendance;
import com.example.Panacea.attendance.entity.AttendanceReport;
import com.example.Panacea.attendance.repository.AttendanceReportRepository;
import com.example.Panacea.attendance.repository.AttendanceRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.results.entity.StudentResult;
import com.example.Panacea.results.repository.StudentResultRepository;
import com.example.Panacea.risk.dto.StudentRiskResponse;
import com.example.Panacea.risk.repository.RiskSnapshotRepository;
import com.example.Panacea.risk.service.RiskScoringService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.Set;

/**
 * Populates the Computer Science department with realistic demo data (HOD, teachers,
 * students, subjects, attendance history and marks) so the app has something to look
 * at locally without a real institution's data.
 *
 * <p>Disabled unless {@code panacea.demo-data.enabled=true} — this must never run
 * against a real deployment. Every write is guarded by an existence check, so running
 * it again (e.g. on every local restart) does not create duplicates.
 *
 * <p>The Role enum here only has ADMIN/STAFF/STUDENT — there is no HOD role or
 * "department" entity in this codebase. The HOD is seeded as a STAFF user and the
 * {@link Course} entity ("B.Tech Computer Science Engineering") stands in for the
 * department. A student's roll number is a display-only convention written to the
 * credentials file, not a persisted column, since {@link User} has no such field.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "panacea.demo-data", name = "enabled", havingValue = "true")
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private static final String DEMO_PASSWORD = "Demo@123";
    private static final String EMAIL_DOMAIN = "panacea.edu.in";
    private static final String COURSE_NAME = "B.Tech Computer Science Engineering";
    private static final int SEMESTER_NUMBER = 5;
    private static final String SEMESTER_LABEL = "Semester 5";
    private static final int STUDENT_COUNT = 35;
    private static final int TEACHER_COUNT = 8;

    private static final String[][] SUBJECT_DEFS = {
            {"Operating Systems", "4"},
            {"Database Management Systems", "4"},
            {"Computer Networks", "3"},
            {"Design and Analysis of Algorithms", "4"},
            {"Object Oriented Software Engineering", "3"},
    };

    private static final String[] MALE_FIRST_NAMES = {
            "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
            "Ishaan", "Kabir", "Rohan", "Aryan", "Karthik", "Siddharth", "Rahul", "Amit",
            "Nikhil", "Varun", "Pranav", "Abhishek", "Manish", "Rajesh", "Vikram", "Sandeep",
            "Gaurav", "Harsh", "Naveen", "Deepak", "Akash", "Yash", "Dhruv", "Tanay",
    };

    private static final String[] FEMALE_FIRST_NAMES = {
            "Ananya", "Diya", "Ishita", "Kavya", "Myra", "Sara", "Aadhya", "Riya",
            "Anika", "Meera", "Priya", "Sneha", "Pooja", "Neha", "Divya", "Shreya",
            "Nisha", "Swati", "Kritika", "Anjali", "Lakshmi", "Deepika", "Pallavi", "Aishwarya",
            "Nandini", "Vidya", "Sanya", "Tanvi", "Isha", "Radhika", "Sakshi", "Gauri",
    };

    private static final String[] LAST_NAMES = {
            "Sharma", "Verma", "Gupta", "Iyer", "Nair", "Reddy", "Rao", "Menon",
            "Pillai", "Kulkarni", "Joshi", "Patil", "Deshmukh", "Chatterjee", "Banerjee", "Mukherjee",
            "Das", "Bose", "Singh", "Kumar", "Yadav", "Mishra", "Tiwari", "Chauhan",
            "Naidu", "Krishnan", "Subramaniam", "Pandey", "Agarwal", "Bhat", "Shetty", "Rathore",
    };

    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final SemesterRepository semesterRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceReportRepository attendanceReportRepository;
    private final StudentResultRepository studentResultRepository;
    private final RiskScoringService riskScoringService;
    private final RiskSnapshotRepository riskSnapshotRepository;
    private final PasswordEncoder passwordEncoder;

    private final Random random = new Random(20260829L);
    private final Set<String> usedFullNames = new HashSet<>();
    private final Set<String> usedEmails = new HashSet<>();

    private enum RiskProfile { HIGH, MEDIUM, LOW }

    private record StudentSeed(User user, Section section, RiskProfile profile) { }

    private record CredentialRow(String role, String fullName, String email, String password, String details) { }

    @Override
    @Transactional
    public void run(String... args) {
        Course course = getOrCreateCourse();
        Semester semester = getOrCreateSemester();
        Section sectionA = getOrCreateSection(course, "A");
        Section sectionB = getOrCreateSection(course, "B");

        List<CredentialRow> credentialRows = new ArrayList<>();

        List<User> staff = seedStaff();
        List<Subject> subjects = seedSubjects(course, semester, sectionA, sectionB, staff);
        credentialRows.addAll(buildStaffCredentialRows(staff, subjects));
        List<StudentSeed> students = seedStudents(sectionA, sectionB, credentialRows);

        seedAttendance(subjects, sectionA, sectionB, students);
        seedResults(subjects, semester, students);
        seedRiskHistory(students);

        addExistingAdminNote(credentialRows);
        writeCredentialsFile(credentialRows);

        log.info("Demo data seed complete: {} staff, {} students, {} subjects for '{}'.",
                staff.size(), students.size(), subjects.size(), COURSE_NAME);
    }

    // ---- Academic structure -------------------------------------------------

    private Course getOrCreateCourse() {
        return courseRepository.findByNameIgnoreCase(COURSE_NAME)
                .orElseGet(() -> courseRepository.save(Course.builder().name(COURSE_NAME).build()));
    }

    private Semester getOrCreateSemester() {
        return semesterRepository.findByNumber(SEMESTER_NUMBER)
                .orElseGet(() -> semesterRepository.save(Semester.builder()
                        .number(SEMESTER_NUMBER)
                        .label(SEMESTER_LABEL)
                        .build()));
    }

    private Section getOrCreateSection(Course course, String name) {
        return sectionRepository.findByCourseIdAndNameIgnoreCase(course.getId(), name)
                .orElseGet(() -> sectionRepository.save(Section.builder()
                        .name(name)
                        .course(course)
                        .build()));
    }

    private List<Subject> seedSubjects(Course course, Semester semester, Section sectionA, Section sectionB,
                                        List<User> staff) {
        List<Subject> subjects = new ArrayList<>();
        Set<Course> courses = new HashSet<>(Set.of(course));
        Set<Section> sections = new HashSet<>(Set.of(sectionA, sectionB));

        for (int i = 0; i < SUBJECT_DEFS.length; i++) {
            String name = SUBJECT_DEFS[i][0];
            int credits = Integer.parseInt(SUBJECT_DEFS[i][1]);
            User teacher = staff.get(i % staff.size());

            Subject subject = subjectRepository.findByNameIgnoreCaseAndSemesterId(name, semester.getId())
                    .orElseGet(() -> subjectRepository.save(Subject.builder()
                            .name(name)
                            .credits(credits)
                            .primaryStaff(teacher)
                            .semester(semester)
                            .courses(new HashSet<>(courses))
                            .sections(new HashSet<>(sections))
                            .build()));
            subjects.add(subject);
        }
        return subjects;
    }

    // ---- Users ----------------------------------------------------------------

    /** Index 0 is always the HOD, by convention with {@link #buildStaffCredentialRows}. */
    private List<User> seedStaff() {
        List<User> staff = new ArrayList<>();
        for (int i = 0; i < 1 + TEACHER_COUNT; i++) {
            String[] name = nextName();
            String email = emailFor(name[0], name[1]);
            staff.add(getOrCreateUser(email, name[0], name[1], Role.STAFF));
        }
        return staff;
    }

    /** Derives each teacher's "teaches X" note from the actual primaryStaff assignment on subjects. */
    private List<CredentialRow> buildStaffCredentialRows(List<User> staff, List<Subject> subjects) {
        List<CredentialRow> rows = new ArrayList<>();
        for (int i = 0; i < staff.size(); i++) {
            User user = staff.get(i);
            boolean isHod = i == 0;
            String taught = subjects.stream()
                    .filter(s -> s.getPrimaryStaff() != null && s.getPrimaryStaff().getId().equals(user.getId()))
                    .map(Subject::getName)
                    .reduce((a, b) -> a + ", " + b)
                    .orElse(null);

            String role = isHod ? "HOD" : "Teacher";
            String details = (isHod ? "Head of Department, Computer Science" : "Teacher, Computer Science")
                    + (taught != null ? " — teaches " + taught : "");
            rows.add(new CredentialRow(role, user.getFirstName() + " " + user.getLastName(),
                    user.getEmail(), DEMO_PASSWORD, details));
        }
        return rows;
    }

    private List<StudentSeed> seedStudents(Section sectionA, Section sectionB, List<CredentialRow> credentialRows) {
        List<StudentSeed> students = new ArrayList<>();
        int sectionASize = (STUDENT_COUNT + 1) / 2;

        for (int i = 0; i < STUDENT_COUNT; i++) {
            String[] name = nextName();
            String email = emailFor(name[0], name[1]);
            User user = getOrCreateUser(email, name[0], name[1], Role.STUDENT);

            Section section = i < sectionASize ? sectionA : sectionB;
            RiskProfile profile = riskProfileFor(i);
            students.add(new StudentSeed(user, section, profile));

            String rollNumber = String.format(Locale.ROOT, "CSE21%03d", i + 1);
            String details = "Roll No " + rollNumber + ", Section " + section.getName()
                    + ", " + SEMESTER_LABEL + " — " + describeProfile(profile);
            credentialRows.add(new CredentialRow("Student", name[0] + " " + name[1], email, DEMO_PASSWORD, details));
        }
        return students;
    }

    /** ~1/3 high performers, ~40% average, ~1/4 at-risk — enough spread for at-risk analytics demos. */
    private RiskProfile riskProfileFor(int index) {
        if (index < 11) {
            return RiskProfile.HIGH;
        }
        if (index < 26) {
            return RiskProfile.MEDIUM;
        }
        return RiskProfile.LOW;
    }

    private String describeProfile(RiskProfile profile) {
        return switch (profile) {
            case HIGH -> "high attendance & marks";
            case MEDIUM -> "average, somewhat inconsistent";
            case LOW -> "low attendance & marks (at-risk)";
        };
    }

    private User getOrCreateUser(String email, String firstName, String lastName, Role role) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.save(User.builder()
                        .email(email)
                        .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                        .firstName(firstName)
                        .lastName(lastName)
                        .role(role)
                        .enabled(true)
                        .build()));
    }

    private String[] nextName() {
        String first;
        String last;
        int guard = 0;
        do {
            boolean male = random.nextBoolean();
            String[] pool = male ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES;
            first = pool[random.nextInt(pool.length)];
            last = LAST_NAMES[random.nextInt(LAST_NAMES.length)];
            guard++;
        } while (!usedFullNames.add(first + " " + last) && guard < 500);
        return new String[]{first, last};
    }

    private String emailFor(String firstName, String lastName) {
        String base = (firstName + "." + lastName).toLowerCase(Locale.ROOT).replaceAll("[^a-z.]", "");
        String email = base + "@" + EMAIL_DOMAIN;
        int suffix = 1;
        while (!usedEmails.add(email)) {
            suffix++;
            email = base + suffix + "@" + EMAIL_DOMAIN;
        }
        return email;
    }

    // ---- Attendance -------------------------------------------------------------

    private void seedAttendance(List<Subject> subjects, Section sectionA, Section sectionB,
                                 List<StudentSeed> students) {
        for (Subject subject : subjects) {
            seedAttendanceForSection(subject, sectionA, studentsIn(students, sectionA));
            seedAttendanceForSection(subject, sectionB, studentsIn(students, sectionB));
        }
    }

    private List<StudentSeed> studentsIn(List<StudentSeed> students, Section section) {
        return students.stream().filter(s -> s.section().getId().equals(section.getId())).toList();
    }

    private void seedAttendanceForSection(Subject subject, Section section, List<StudentSeed> roster) {
        if (roster.isEmpty() || attendanceRepository.existsBySubjectIdAndSectionId(subject.getId(), section.getId())) {
            return;
        }

        User staff = subject.getPrimaryStaff();
        LocalDate sessionDate = LocalDate.now().minusDays(70);
        int sessionCount = 10;

        for (int session = 0; session < sessionCount; session++) {
            Attendance attendance = attendanceRepository.save(Attendance.builder()
                    .subject(subject)
                    .section(section)
                    .staff(staff)
                    .date(sessionDate)
                    .period((session % 6) + 1)
                    .build());

            List<AttendanceReport> reports = new ArrayList<>();
            for (StudentSeed student : roster) {
                boolean present = random.nextDouble() < attendanceChance(student.profile());
                reports.add(AttendanceReport.builder()
                        .attendance(attendance)
                        .student(student.user())
                        .present(present)
                        .build());
            }
            attendanceReportRepository.saveAll(reports);

            sessionDate = sessionDate.plusDays(7);
        }
    }

    private double attendanceChance(RiskProfile profile) {
        return switch (profile) {
            case HIGH -> 0.93;
            case MEDIUM -> 0.76;
            case LOW -> 0.52;
        };
    }

    // ---- Results ------------------------------------------------------------------

    private void seedResults(List<Subject> subjects, Semester semester, List<StudentSeed> students) {
        for (StudentSeed student : students) {
            for (Subject subject : subjects) {
                if (studentResultRepository
                        .findByStudentIdAndSubjectIdAndSemesterId(student.user().getId(), subject.getId(), semester.getId())
                        .isPresent()) {
                    continue;
                }
                studentResultRepository.save(StudentResult.builder()
                        .student(student.user())
                        .subject(subject)
                        .semester(semester)
                        .test1(markInRange(student.profile(), 0))
                        .test2(markInRange(student.profile(), 1))
                        .quiz(markInRange(student.profile(), 2))
                        .experiential(markInRange(student.profile(), 3))
                        .see(markInRange(student.profile(), 4))
                        .build());
            }
        }
    }

    /**
     * component: 0=test1(/20) 1=test2(/20, trends down for at-risk students) 2=quiz(/10)
     * 3=experiential(/10) 4=see(/40).
     */
    private double markInRange(RiskProfile profile, int component) {
        double max = switch (component) {
            case 0, 1 -> 20.0;
            case 2, 3 -> 10.0;
            default -> 40.0;
        };
        double[] band = switch (profile) {
            case HIGH -> new double[]{0.80, 0.97};
            case MEDIUM -> new double[]{0.55, 0.78};
            case LOW -> new double[]{0.25, 0.55};
        };
        double lowFraction = band[0];
        double highFraction = band[1];
        if (component == 1 && profile == RiskProfile.LOW) {
            highFraction -= 0.10;
        }
        double fraction = lowFraction + random.nextDouble() * (highFraction - lowFraction);
        double value = Math.round(fraction * max * 2) / 2.0;
        return Math.max(0.0, Math.min(max, value));
    }

    // ---- Risk history (synthetic backfill) -----------------------------------------

    private static final int HISTORY_CHECKPOINTS = 6;
    private static final int HISTORY_INTERVAL_DAYS = 7;

    /**
     * Backfills {@code HISTORY_CHECKPOINTS} weekly {@code RiskSnapshot} rows per
     * student so the risk-trend indicator has something to show immediately, instead
     * of waiting for {@code RiskSnapshotScheduler}'s nightly job to accumulate real
     * history. This is explicitly synthetic: marks have no date in this schema, so
     * there's no real historical attendance/marks to recompute risk against — see
     * {@code RiskScoringService.recordSyntheticSnapshot}. The most recent checkpoint
     * always equals the real, live-computed value; earlier ones drift from it based on
     * the student's seeded profile (HIGH improves over time, LOW declines, MEDIUM is
     * flat with noise), so the trend tells a plausible story without pretending to be
     * real historical data.
     */
    private void seedRiskHistory(List<StudentSeed> students) {
        for (StudentSeed student : students) {
            Long studentId = student.user().getId();
            if (riskSnapshotRepository.existsByStudentId(studentId)) {
                continue;
            }

            StudentRiskResponse current = riskScoringService.computeRisk(studentId);
            double weeklyDrift = weeklyDriftFor(student.profile());
            Instant now = Instant.now();

            for (int i = 0; i < HISTORY_CHECKPOINTS; i++) {
                int stepsAgo = HISTORY_CHECKPOINTS - 1 - i;
                double noise = stepsAgo == 0 ? 0.0 : (random.nextDouble() - 0.5) * 6.0;
                double worseness = weeklyDrift * stepsAgo + noise;

                double attendance = clamp(current.attendancePercentage() - worseness, 0.0, 100.0);
                double marks = clamp(current.averageMarksPercentage() - worseness, 0.0, 100.0);
                double probability = clamp(current.riskProbability() + worseness / 100.0, 0.0, 1.0);

                riskScoringService.recordSyntheticSnapshot(studentId,
                        now.minus(Duration.ofDays((long) stepsAgo * HISTORY_INTERVAL_DAYS)),
                        attendance, marks, current.marksTrend(), probability);
            }
        }
    }

    /** Positive = past checkpoints were worse (improving trend); negative = past was better (declining trend). */
    private double weeklyDriftFor(RiskProfile profile) {
        return switch (profile) {
            case HIGH -> 2.5;
            case MEDIUM -> 0.0;
            case LOW -> -2.5;
        };
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    // ---- Credentials file --------------------------------------------------------

    private void addExistingAdminNote(List<CredentialRow> credentialRows) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            credentialRows.add(0, new CredentialRow("Admin", admin.getFirstName() + " " + admin.getLastName(),
                    admin.getEmail(), "(existing account — see panacea.security.bootstrap-admin.password in your local application.properties)",
                    "Pre-existing admin, not created by the demo seeder"));
        }
    }

    private void writeCredentialsFile(List<CredentialRow> rows) {
        StringBuilder csv = new StringBuilder("Role,Full Name,Username,Email,Password,Details\n");
        for (CredentialRow row : rows) {
            csv.append(csvField(row.role())).append(',')
                    .append(csvField(row.fullName())).append(',')
                    .append(csvField(row.email())).append(',')
                    .append(csvField(row.email())).append(',')
                    .append(csvField(row.password())).append(',')
                    .append(csvField(row.details())).append('\n');
        }

        try {
            Path path = Path.of("demo-credentials.csv");
            Files.writeString(path, csv.toString(), StandardCharsets.UTF_8);
            log.info("Wrote demo credentials to {}", path.toAbsolutePath());
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to write demo-credentials.csv", e);
        }
    }

    private String csvField(String value) {
        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
