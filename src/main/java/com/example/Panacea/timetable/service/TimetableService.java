package com.example.Panacea.timetable.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.entity.SubjectStaffAssignment;
import com.example.Panacea.academic.entity.SubjectType;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.academic.repository.SectionRepository;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.academic.repository.SubjectStaffAssignmentRepository;
import com.example.Panacea.audit.service.AuditLogService;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.HodScopeResolver;
import com.example.Panacea.student.entity.StudentProfile;
import com.example.Panacea.student.service.StudentProfileService;
import com.example.Panacea.timetable.dto.BatchTimetableGenerationResponse;
import com.example.Panacea.timetable.dto.GenerateCourseTimetableRequest;
import com.example.Panacea.timetable.dto.GenerateTimetableRequest;
import com.example.Panacea.timetable.dto.PublishTimetableRequest;
import com.example.Panacea.timetable.dto.SectionGenerationSummary;
import com.example.Panacea.timetable.dto.TimetableEntryResponse;
import com.example.Panacea.timetable.dto.TimetableGenerationResponse;
import com.example.Panacea.timetable.dto.TimetablePublishResponse;
import com.example.Panacea.timetable.entity.TimetableEntry;
import com.example.Panacea.timetable.repository.TimetableEntryRepository;
import com.google.ortools.Loader;
import com.google.ortools.sat.BoolVar;
import com.google.ortools.sat.CpModel;
import com.google.ortools.sat.CpSolver;
import com.google.ortools.sat.CpSolverStatus;
import com.google.ortools.sat.LinearExpr;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Constraint-Satisfaction Problem (CSP) timetable scheduler powered by Google OR-Tools CP-SAT.
 *
 * Formulates multi-section timetable scheduling as an exact maximum-satisfaction CSP that:
 * - Supports flexible per-(subject, section) staff assignments (1 to N staff per subject).
 * - Enforces hard composite constraints across all sections simultaneously:
 *   1. Staff + Day + Period uniqueness (no staff member is scheduled for two sections at once).
 *   2. Section + Day + Period uniqueness (no section is scheduled for two classes at once).
 *   3. At most one session of any subject per section per day (credits distributed across distinct days).
 *   4. Upper bound of subject.credits weekly sessions per (subject, section).
 * - Objective: Maximizes total scheduled sessions. When a 100% complete schedule is feasible, all
 *   demanded credits are scheduled and persisted.
 * - When an over-subscription or conflict makes a complete schedule impossible, CP-SAT produces
 *   granular diagnostic feedback pinpointing the exact subject, section, staff, and session deficit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TimetableService {

    static {
        Loader.loadNativeLibraries();
    }

    private static final List<DayOfWeek> DAYS = List.of(
            DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY);
    private static final int MIN_PERIOD = 1;
    private static final int MAX_PERIOD = 6;
    private static final int TOTAL_WEEKLY_PERIODS = DAYS.size() * (MAX_PERIOD - MIN_PERIOD + 1);

    private final SubjectRepository subjectRepository;
    private final SectionRepository sectionRepository;
    private final SemesterRepository semesterRepository;
    private final CourseRepository courseRepository;
    private final TimetableEntryRepository timetableEntryRepository;
    private final SubjectStaffAssignmentRepository subjectStaffAssignmentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final HodScopeResolver hodScopeResolver;
    private final StudentProfileService studentProfileService;

    @Transactional(readOnly = true)
    public List<TimetableEntryResponse> findBySection(Long sectionId) {
        return timetableEntryRepository.findBySectionIdOrderByDayAscPeriodAsc(sectionId)
                .stream().map(TimetableEntryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<TimetableEntryResponse> findByStaff(Long staffId) {
        return timetableEntryRepository.findByStaffIdOrderByDayAscPeriodAsc(staffId)
                .stream().map(TimetableEntryResponse::from).toList();
    }

    /**
     * The student dashboard's read: only published entries for the
     * student's own section, resolved server-side from their StudentProfile
     * (same pattern as StudentProfileService#findCoreSubjects) — never a
     * caller-supplied sectionId, so a student can't view another section's
     * timetable by guessing its id.
     */
    @Transactional(readOnly = true)
    public List<TimetableEntryResponse> findMyTimetable(Long studentUserId) {
        StudentProfile profile = studentProfileService.getByUserId(studentUserId);
        return timetableEntryRepository.findBySectionIdAndPublishedTrueOrderByDayAscPeriodAsc(profile.getSection().getId())
                .stream().map(TimetableEntryResponse::from).toList();
    }

    @Transactional
    public TimetableGenerationResponse generate(GenerateTimetableRequest request, Long actorId) {
        User actor = resolveActor(actorId);
        Semester semester = resolveSemester(request.semesterId());
        Section section = resolveSection(request.sectionId());
        requireHodScopeAllowsSection(section, actor);

        List<Subject> subjects = subjectRepository
                .findBySemesterIdAndSectionsId(semester.getId(), section.getId())
                .stream()
                .filter(subject -> subject.getCredits() != null && subject.getCredits() > 0)
                .toList();

        ScheduleResult result = solveTimetable(List.of(section), subjects);

        auditLogService.record(actor, "TIMETABLE_REGENERATE", "Section", section.getId(),
                "Generated " + result.totalCreated() + " entries (" + result.totalSkipped() + " skipped) for semester "
                        + semester.getId());

        return new TimetableGenerationResponse(result.totalCreated(), result.totalSkipped(), result.errors());
    }

    /**
     * Department-wide batch generation: schedules all core subjects plus selected electives
     * across all sections under the course simultaneously via CP-SAT.
     */
    @Transactional
    public BatchTimetableGenerationResponse generateForCourse(GenerateCourseTimetableRequest request, Long actorId) {
        User actor = resolveActor(actorId);
        Semester semester = resolveSemester(request.semesterId());
        Course course = resolveCourse(request.courseId());
        requireHodScopeAllowsCourse(course, actor);

        List<Subject> coreSubjects = subjectRepository.findByCoursesIdAndSemesterIdAndType(
                course.getId(), semester.getId(), SubjectType.CORE);
        List<Subject> electiveSubjects = resolveSelectedElectives(request.electiveSubjectIds(), course, semester);

        List<Subject> subjects = Stream.concat(coreSubjects.stream(), electiveSubjects.stream())
                .filter(subject -> subject.getCredits() != null && subject.getCredits() > 0)
                .toList();

        List<Section> sections = sectionRepository.findByCourseId(course.getId());
        if (sections.isEmpty()) {
            throw new IllegalArgumentException("Course " + course.getId() + " has no sections");
        }

        ScheduleResult result = solveTimetable(sections, subjects);

        auditLogService.record(actor, "TIMETABLE_REGENERATE_COURSE", "Course", course.getId(),
                "Generated " + result.totalCreated() + " entries (" + result.totalSkipped() + " skipped) across "
                        + sections.size() + " sections for semester " + semester.getId());

        return new BatchTimetableGenerationResponse(
                result.totalCreated(), result.totalSkipped(), result.errors(), result.summaries());
    }

    /**
     * The "Save" action: makes every draft entry generateForCourse (or the
     * single-section generate) produced for this course+semester visible on
     * the affected sections' student dashboards.
     */
    @Transactional
    public TimetablePublishResponse publishForCourse(PublishTimetableRequest request, Long actorId) {
        User actor = resolveActor(actorId);
        Semester semester = resolveSemester(request.semesterId());
        Course course = resolveCourse(request.courseId());
        requireHodScopeAllowsCourse(course, actor);

        List<Section> sections = sectionRepository.findByCourseId(course.getId());
        List<Long> sectionIds = sections.stream().map(Section::getId).toList();

        int entriesPublished = sectionIds.isEmpty() ? 0
                : timetableEntryRepository.publishBySectionIdInAndSemesterId(sectionIds, semester.getId());

        auditLogService.record(actor, "TIMETABLE_PUBLISH", "Course", course.getId(),
                "Published " + entriesPublished + " entries across " + sections.size()
                        + " sections for semester " + semester.getId());

        return new TimetablePublishResponse(sections.size(), entriesPublished);
    }

    /**
     * Core CP-SAT Solver implementation.
     * Maps the timetable generation problem across the given sections and subjects into a CSP.
     */
    private ScheduleResult solveTimetable(List<Section> sections, List<Subject> subjects) {
        List<String> errors = new ArrayList<>();
        List<ClassTarget> targets = new ArrayList<>();

        // 1. Resolve assigned staff for each (subject, section) pair
        for (Section section : sections) {
            for (Subject subject : subjects) {
                User staff = resolveStaffForSubjectAndSection(subject, section);
                if (staff == null) {
                    errors.add("No staff assigned for subject '" + subject.getName() + "' in section '" + section.getName() + "'");
                    continue;
                }
                targets.add(new ClassTarget(subject, section, staff, subject.getCredits()));
            }
        }

        if (targets.isEmpty()) {
            List<SectionGenerationSummary> emptySummaries = sections.stream()
                    .map(s -> new SectionGenerationSummary(s.getId(), s.getName(), 0, 0))
                    .sorted(Comparator.comparing(SectionGenerationSummary::sectionName))
                    .toList();
            return new ScheduleResult(0, 0, errors, emptySummaries);
        }

        // 2. Pre-flight structural bottleneck diagnostics
        runPreFlightDiagnostics(targets, sections, errors);

        Set<Long> batchSectionIds = sections.stream().map(Section::getId).collect(Collectors.toSet());
        Set<Long> batchSubjectIds = subjects.stream().map(Subject::getId).collect(Collectors.toSet());

        // 3. Seed external occupancy for staff and sections (excluding entries in this exact batch that will be replaced)
        Set<Long> staffIds = targets.stream().map(t -> t.staff().getId()).collect(Collectors.toSet());
        Set<String> occupiedStaffSlots = new HashSet<>();
        if (!staffIds.isEmpty()) {
            for (TimetableEntry existing : timetableEntryRepository.findByStaffIdIn(staffIds)) {
                boolean isCurrentBatchEntry = batchSectionIds.contains(existing.getSection().getId())
                        && batchSubjectIds.contains(existing.getSubject().getId());
                if (!isCurrentBatchEntry) {
                    occupiedStaffSlots.add(slotKey(existing.getStaff().getId(), existing.getDay(), existing.getPeriod()));
                }
            }
        }

        Set<String> occupiedSectionSlots = new HashSet<>();
        for (Section section : sections) {
            for (TimetableEntry existing : timetableEntryRepository.findBySectionIdOrderByDayAscPeriodAsc(section.getId())) {
                boolean isCurrentBatchEntry = batchSubjectIds.contains(existing.getSubject().getId());
                if (!isCurrentBatchEntry) {
                    occupiedSectionSlots.add(slotKey(existing.getSection().getId(), existing.getDay(), existing.getPeriod()));
                }
            }
        }

        // 4. Formulate CP-SAT Model with Maximum Satisfaction Objective
        CpModel model = new CpModel();
        Map<TargetSlot, BoolVar> varMap = new HashMap<>();
        List<BoolVar> allVars = new ArrayList<>();
        int totalCreditsNeeded = 0;

        for (int i = 0; i < targets.size(); i++) {
            ClassTarget target = targets.get(i);
            totalCreditsNeeded += target.credits();
            for (DayOfWeek day : DAYS) {
                for (int period = MIN_PERIOD; period <= MAX_PERIOD; period++) {
                    String staffKey = slotKey(target.staff().getId(), day, period);
                    String sectionKey = slotKey(target.section().getId(), day, period);

                    // If slot is occupied by external entries outside this batch, do not create variable (constrained to 0)
                    if (occupiedStaffSlots.contains(staffKey) || occupiedSectionSlots.contains(sectionKey)) {
                        continue;
                    }

                    BoolVar var = model.newBoolVar("x_" + i + "_" + day.name() + "_" + period);
                    varMap.put(new TargetSlot(i, day, period), var);
                    allVars.add(var);
                }
            }
        }

        // Constraint A: At most subject.credits weekly sessions for each target (subject, section)
        for (int i = 0; i < targets.size(); i++) {
            ClassTarget target = targets.get(i);
            List<BoolVar> targetVars = new ArrayList<>();
            for (DayOfWeek day : DAYS) {
                for (int period = MIN_PERIOD; period <= MAX_PERIOD; period++) {
                    BoolVar v = varMap.get(new TargetSlot(i, day, period));
                    if (v != null) {
                        targetVars.add(v);
                    }
                }
            }
            if (!targetVars.isEmpty()) {
                model.addLessOrEqual(LinearExpr.sum(targetVars.toArray(new BoolVar[0])), target.credits());
            }
        }

        // Constraint B: At most one class per subject per day for each section
        for (int i = 0; i < targets.size(); i++) {
            for (DayOfWeek day : DAYS) {
                List<BoolVar> dayVars = new ArrayList<>();
                for (int period = MIN_PERIOD; period <= MAX_PERIOD; period++) {
                    BoolVar v = varMap.get(new TargetSlot(i, day, period));
                    if (v != null) {
                        dayVars.add(v);
                    }
                }
                if (!dayVars.isEmpty()) {
                    model.addLessOrEqual(LinearExpr.sum(dayVars.toArray(new BoolVar[0])), 1);
                }
            }
        }

        // Constraint C: Section + Day + Period uniqueness (no section double-booking)
        for (Section section : sections) {
            for (DayOfWeek day : DAYS) {
                for (int period = MIN_PERIOD; period <= MAX_PERIOD; period++) {
                    List<BoolVar> sectionSlotVars = new ArrayList<>();
                    for (int i = 0; i < targets.size(); i++) {
                        if (targets.get(i).section().getId().equals(section.getId())) {
                            BoolVar v = varMap.get(new TargetSlot(i, day, period));
                            if (v != null) {
                                sectionSlotVars.add(v);
                            }
                        }
                    }
                    if (sectionSlotVars.size() > 1) {
                        model.addLessOrEqual(LinearExpr.sum(sectionSlotVars.toArray(new BoolVar[0])), 1);
                    }
                }
            }
        }

        // Constraint D: Staff + Day + Period uniqueness (no staff double-booking across any section)
        for (Long staffId : staffIds) {
            for (DayOfWeek day : DAYS) {
                for (int period = MIN_PERIOD; period <= MAX_PERIOD; period++) {
                    List<BoolVar> staffSlotVars = new ArrayList<>();
                    for (int i = 0; i < targets.size(); i++) {
                        if (targets.get(i).staff().getId().equals(staffId)) {
                            BoolVar v = varMap.get(new TargetSlot(i, day, period));
                            if (v != null) {
                                staffSlotVars.add(v);
                            }
                        }
                    }
                    if (staffSlotVars.size() > 1) {
                        model.addLessOrEqual(LinearExpr.sum(staffSlotVars.toArray(new BoolVar[0])), 1);
                    }
                }
            }
        }

        // Objective: Maximize total scheduled sessions
        if (!allVars.isEmpty()) {
            model.maximize(LinearExpr.sum(allVars.toArray(new BoolVar[0])));
        }

        // 5. Solve the Model
        CpSolver solver = new CpSolver();
        solver.getParameters().setMaxTimeInSeconds(10.0);
        solver.getParameters().setRandomSeed(ThreadLocalRandom.current().nextInt(1, 1_000_000));

        CpSolverStatus status = solver.solve(model);
        log.info("CP-SAT solver returned status: {} in {} ms", status, (int) (solver.userTime() * 1000));

        if (status != CpSolverStatus.OPTIMAL && status != CpSolverStatus.FEASIBLE) {
            errors.add("Could not find a feasible conflict-free timetable satisfying all constraints.");
            List<SectionGenerationSummary> summaries = sections.stream()
                    .map(s -> new SectionGenerationSummary(s.getId(), s.getName(), 0, 0))
                    .sorted(Comparator.comparing(SectionGenerationSummary::sectionName))
                    .toList();
            return new ScheduleResult(0, 0, errors, summaries);
        }

        // 6. Calculate Per-Target Scheduled Count & Detailed Infeasibility Diagnostics
        Map<Integer, Integer> scheduledCountByTarget = new HashMap<>();
        int totalScheduled = 0;

        for (Map.Entry<TargetSlot, BoolVar> entry : varMap.entrySet()) {
            if (solver.booleanValue(entry.getValue())) {
                scheduledCountByTarget.merge(entry.getKey().targetIndex(), 1, Integer::sum);
                totalScheduled++;
            }
        }

        for (int i = 0; i < targets.size(); i++) {
            ClassTarget target = targets.get(i);
            int scheduled = scheduledCountByTarget.getOrDefault(i, 0);
            if (scheduled < target.credits()) {
                errors.add("Could only schedule %d of %d sessions for subject '%s' in section '%s' (Staff: %s %s)"
                        .formatted(scheduled, target.credits(), target.subject().getName(), target.section().getName(),
                                target.staff().getFirstName(), target.staff().getLastName()));
            }
        }

        // If total scheduled falls short of demanded credits, report diagnostic errors without touching existing DB entries
        if (totalScheduled < totalCreditsNeeded) {
            List<SectionGenerationSummary> summaries = sections.stream()
                    .map(s -> new SectionGenerationSummary(s.getId(), s.getName(), 0, 0))
                    .sorted(Comparator.comparing(SectionGenerationSummary::sectionName))
                    .toList();
            return new ScheduleResult(0, 0, errors, summaries);
        }

        // 7. Atomic Clean-and-Persist: delete previous entries and insert new ones
        for (Section section : sections) {
            timetableEntryRepository.deleteBySectionIdAndSubjectIdIn(section.getId(), batchSubjectIds);
        }

        Map<Long, Integer> createdPerSection = new HashMap<>();
        int totalCreated = 0;

        for (Map.Entry<TargetSlot, BoolVar> entry : varMap.entrySet()) {
            if (solver.booleanValue(entry.getValue())) {
                TargetSlot slot = entry.getKey();
                ClassTarget target = targets.get(slot.targetIndex());

                TimetableEntry timetableEntry = TimetableEntry.builder()
                        .subject(target.subject())
                        .section(target.section())
                        .staff(target.staff())
                        .day(slot.day())
                        .period(slot.period())
                        .published(false)
                        .build();

                timetableEntryRepository.saveAndFlush(timetableEntry);
                createdPerSection.merge(target.section().getId(), 1, Integer::sum);
                totalCreated++;
            }
        }

        List<SectionGenerationSummary> summaries = sections.stream()
                .map(s -> new SectionGenerationSummary(s.getId(), s.getName(), createdPerSection.getOrDefault(s.getId(), 0), 0))
                .sorted(Comparator.comparing(SectionGenerationSummary::sectionName))
                .toList();

        return new ScheduleResult(totalCreated, 0, errors, summaries);
    }

    /**
     * Checks for structural over-subscriptions before solver invocation to provide
     * immediate root-cause diagnosis.
     */
    private void runPreFlightDiagnostics(List<ClassTarget> targets, List<Section> sections, List<String> errors) {
        // Check 1: Subject credits vs weekly days (max 1 class/day)
        for (ClassTarget target : targets) {
            if (target.credits() > DAYS.size()) {
                errors.add("Subject '%s' has %d credits, which exceeds the maximum of %d days per week (max 1 session/day)"
                        .formatted(target.subject().getName(), target.credits(), DAYS.size()));
            }
        }

        // Check 2: Section capacity
        Map<Long, Integer> creditsBySection = new HashMap<>();
        for (ClassTarget target : targets) {
            creditsBySection.merge(target.section().getId(), target.credits(), Integer::sum);
        }
        for (Section section : sections) {
            int demanded = creditsBySection.getOrDefault(section.getId(), 0);
            if (demanded > TOTAL_WEEKLY_PERIODS) {
                errors.add("Section '%s' has %d total weekly sessions demanded, which exceeds maximum section capacity of %d periods"
                        .formatted(section.getName(), demanded, TOTAL_WEEKLY_PERIODS));
            }
        }

        // Check 3: Staff capacity
        Map<Long, Integer> creditsByStaff = new HashMap<>();
        Map<Long, User> staffById = new HashMap<>();
        for (ClassTarget target : targets) {
            creditsByStaff.merge(target.staff().getId(), target.credits(), Integer::sum);
            staffById.put(target.staff().getId(), target.staff());
        }
        for (Map.Entry<Long, Integer> entry : creditsByStaff.entrySet()) {
            if (entry.getValue() > TOTAL_WEEKLY_PERIODS) {
                User staff = staffById.get(entry.getKey());
                errors.add("Staff '%s %s' is assigned %d total weekly sessions across sections, which exceeds maximum staff capacity of %d periods"
                        .formatted(staff.getFirstName(), staff.getLastName(), entry.getValue(), TOTAL_WEEKLY_PERIODS));
            }
        }
    }

    private User resolveStaffForSubjectAndSection(Subject subject, Section section) {
        return subjectStaffAssignmentRepository.findBySubjectIdAndSectionId(subject.getId(), section.getId())
                .map(SubjectStaffAssignment::getStaff)
                .orElse(subject.getPrimaryStaff());
    }

    private record ClassTarget(Subject subject, Section section, User staff, int credits) {
    }

    private record TargetSlot(int targetIndex, DayOfWeek day, int period) {
    }

    private record ScheduleResult(int totalCreated, int totalSkipped, List<String> errors, List<SectionGenerationSummary> summaries) {
    }

    private List<Subject> resolveSelectedElectives(List<Long> electiveSubjectIds, Course course, Semester semester) {
        if (electiveSubjectIds == null || electiveSubjectIds.isEmpty()) {
            return List.of();
        }
        List<Subject> electives = subjectRepository.findAllById(electiveSubjectIds);
        if (electives.size() != electiveSubjectIds.size()) {
            throw new EntityNotFoundException("One or more elective subjects were not found");
        }
        for (Subject elective : electives) {
            if (elective.getType() != SubjectType.ELECTIVE) {
                throw new IllegalArgumentException("Subject " + elective.getId() + " is not an elective");
            }
            if (!semester.getId().equals(elective.getSemester().getId())) {
                throw new IllegalArgumentException(
                        "Subject " + elective.getId() + " does not belong to semester " + semester.getId());
            }
            boolean belongsToCourse = elective.getCourses().stream()
                    .anyMatch(c -> c.getId().equals(course.getId()));
            if (!belongsToCourse) {
                throw new IllegalArgumentException(
                        "Subject " + elective.getId() + " does not belong to course " + course.getId());
            }
        }
        return electives;
    }

    private User resolveActor(Long actorId) {
        return userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("User " + actorId + " not found"));
    }

    private Semester resolveSemester(Long semesterId) {
        return semesterRepository.findById(semesterId)
                .orElseThrow(() -> new EntityNotFoundException("Semester " + semesterId + " not found"));
    }

    private Section resolveSection(Long sectionId) {
        return sectionRepository.findById(sectionId)
                .orElseThrow(() -> new EntityNotFoundException("Section " + sectionId + " not found"));
    }

    private Course resolveCourse(Long courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course " + courseId + " not found"));
    }

    private void requireHodScopeAllowsSection(Section section, User actor) {
        if (hodScopeResolver.resolveScopeCourse(actor) == null) {
            return;
        }
        hodScopeResolver.requireCourseAccess(actor, section.getCourse() != null ? section.getCourse().getId() : null);
    }

    private void requireHodScopeAllowsCourse(Course course, User actor) {
        if (hodScopeResolver.resolveScopeCourse(actor) == null) {
            return;
        }
        hodScopeResolver.requireCourseAccess(actor, course.getId());
    }

    private static String slotKey(Long ownerId, DayOfWeek day, Integer period) {
        return ownerId + ":" + day + ":" + period;
    }
}
