package com.example.Panacea.timetable.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.entity.SubjectType;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.academic.repository.SectionRepository;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
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
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

/**
 * Greedy randomized timetable scheduler, mirroring the reference system's
 * generate_for_session() heuristic: shuffle candidate (day, period) slots for
 * each subject and take the first slot that is free for both the staff member
 * and the section. Randomizing attempt order avoids always starving
 * later-processed subjects of the same early slots.
 *
 * The in-memory availability check is the primary mechanism, but every save
 * still goes through the entity's DB-level unique constraints (staff+day+period,
 * section+day+period) as the final safety net for anything the in-memory check misses.
 *
 * The per-section scheduling loop lives in {@link #scheduleSubjectsForSection},
 * shared by both the original single-section {@link #generate} and the
 * department-wide {@link #generateForCourse} added this session — see that
 * method's javadoc for why a shared re-queried-per-call method (rather than a
 * hand-threaded shared in-memory set) is what makes reusing it across
 * multiple sections in one batch actually safe.
 */
@Service
@RequiredArgsConstructor
public class TimetableService {

    private static final List<DayOfWeek> DAYS = List.of(
            DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY);
    private static final int MIN_PERIOD = 1;
    private static final int MAX_PERIOD = 6;

    private final SubjectRepository subjectRepository;
    private final SectionRepository sectionRepository;
    private final SemesterRepository semesterRepository;
    private final CourseRepository courseRepository;
    private final TimetableEntryRepository timetableEntryRepository;
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
                .filter(subject -> subject.getPrimaryStaff() != null)
                .filter(subject -> subject.getCredits() != null && subject.getCredits() > 0)
                .toList();

        SectionScheduleResult result = scheduleSubjectsForSection(subjects, section);

        auditLogService.record(actor, "TIMETABLE_REGENERATE", "Section", section.getId(),
                "Generated " + result.created() + " entries (" + result.skipped() + " skipped) for semester "
                        + semester.getId());

        return new TimetableGenerationResponse(result.created(), result.skipped(), result.errors());
    }

    /**
     * Department-wide batch generation: every core subject for this
     * Course+Semester (same derivation StudentProfileService#findCoreSubjects
     * uses), plus whichever electives the admin selected, scheduled across
     * every Section under the Course in one call.
     *
     * This is what actually prevents a staff member teaching the same subject
     * to two different sections from being double-booked between them: each
     * section is scheduled via the same {@link #scheduleSubjectsForSection}
     * call the single-section endpoint uses, and that method re-queries
     * "does this staff member already have an entry at (day, period)?" fresh
     * from the DB (not scoped to any one section) on every call. Because each
     * section's entries are saveAndFlush'd immediately (see
     * scheduleSubjectsForSection), the very next section processed in this
     * same loop sees the previous section's newly-committed staff slots as
     * already occupied — so sequential per-section calls within one
     * transaction are sufficient; nothing needs to be rewritten to hold one
     * shared in-memory set across all sections at once.
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
                .filter(subject -> subject.getPrimaryStaff() != null)
                .filter(subject -> subject.getCredits() != null && subject.getCredits() > 0)
                .toList();

        List<Section> sections = sectionRepository.findByCourseId(course.getId());
        if (sections.isEmpty()) {
            throw new IllegalArgumentException("Course " + course.getId() + " has no sections");
        }
        List<Section> shuffledSections = new ArrayList<>(sections);
        Collections.shuffle(shuffledSections);

        int totalCreated = 0;
        int totalSkipped = 0;
        List<String> errors = new ArrayList<>();
        List<SectionGenerationSummary> summaries = new ArrayList<>();

        for (Section section : shuffledSections) {
            SectionScheduleResult result = scheduleSubjectsForSection(subjects, section);
            totalCreated += result.created();
            totalSkipped += result.skipped();
            errors.addAll(result.errors());
            summaries.add(new SectionGenerationSummary(
                    section.getId(), section.getName(), result.created(), result.skipped()));
        }
        summaries.sort(Comparator.comparing(SectionGenerationSummary::sectionName));

        auditLogService.record(actor, "TIMETABLE_REGENERATE_COURSE", "Course", course.getId(),
                "Generated " + totalCreated + " entries (" + totalSkipped + " skipped) across " + sections.size()
                        + " sections for semester " + semester.getId());

        return new BatchTimetableGenerationResponse(totalCreated, totalSkipped, errors, summaries);
    }

    /**
     * The "Save" action: makes every draft entry generateForCourse (or the
     * single-section generate) produced for this course+semester visible on
     * the affected sections' student dashboards. Scoped by (sectionIds,
     * semesterId) rather than "publish every draft everywhere" so publishing
     * one department/semester's batch never touches another semester's
     * still-under-review draft that happens to share a section (e.g. a
     * section that spans a HOD's odd-semester review while an even-semester
     * batch for the same section is also mid-review).
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
     * The shared greedy scheduling loop: shuffles subjects and, for each,
     * shuffled (day, period) candidates, skipping anything already occupied
     * for either the subject's staff member or this section, until every
     * subject's credit count is satisfied or slots run out.
     *
     * occupiedStaffSlots is seeded from every existing TimetableEntry for the
     * staff members teaching `subjects` — queried by staff id, not scoped to
     * `section` — so it reflects that staff member's real occupancy anywhere
     * in the system, not just within this one section. (The original
     * single-section version seeded this from the section's own existing
     * rows only, which meant two sections generated independently could
     * double-book the same staff member — exactly the gap
     * generateForCourse's per-section calls close, since each call here reads
     * the latest DB state including whatever the previous section's call in
     * the same batch just flushed.)
     *
     * Clean-regenerate: existing entries for exactly these (subject, section)
     * pairs are wiped before the occupancy sets are seeded, so calling
     * Generate again for the same course/semester replaces that subject's
     * classes in this section rather than adding more on top of them —
     * without this, a repeated run would silently pile a 4-credit subject up
     * to 8, 12, ... classes/week instead of staying at 4.
     */
    private SectionScheduleResult scheduleSubjectsForSection(List<Subject> subjects, Section section) {
        List<Subject> shuffledSubjects = new ArrayList<>(subjects);
        Collections.shuffle(shuffledSubjects);

        Set<Long> subjectIds = shuffledSubjects.stream().map(Subject::getId).collect(Collectors.toSet());
        if (!subjectIds.isEmpty()) {
            timetableEntryRepository.deleteBySectionIdAndSubjectIdIn(section.getId(), subjectIds);
        }

        Set<Long> staffIds = shuffledSubjects.stream()
                .map(subject -> subject.getPrimaryStaff().getId())
                .collect(Collectors.toSet());
        Set<String> occupiedStaffSlots = new HashSet<>();
        if (!staffIds.isEmpty()) {
            for (TimetableEntry existing : timetableEntryRepository.findByStaffIdIn(staffIds)) {
                occupiedStaffSlots.add(slotKey(existing.getStaff().getId(), existing.getDay(), existing.getPeriod()));
            }
        }
        Set<String> occupiedSectionSlots = new HashSet<>();
        for (TimetableEntry existing : timetableEntryRepository.findBySectionIdOrderByDayAscPeriodAsc(section.getId())) {
            occupiedSectionSlots.add(slotKey(existing.getSection().getId(), existing.getDay(), existing.getPeriod()));
        }

        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (Subject subject : shuffledSubjects) {
            User staff = subject.getPrimaryStaff();
            int classesNeeded = subject.getCredits();

            List<DayOfWeek> days = new ArrayList<>(DAYS);
            Collections.shuffle(days);

            for (DayOfWeek day : days) {
                if (classesNeeded == 0) {
                    break;
                }
                // At most one class of a given subject per day — credits is a
                // weekly total (e.g. 3 credits = 3 one-hour classes spread
                // across 3 different days), never multiple hours of the same
                // subject stacked on one day. The `break` right after a
                // successful save (below) stops trying further periods once
                // this day has yielded one class; a rejected/occupied period
                // still just moves on to the next period within the same
                // day, same as before.
                List<Integer> periods = shuffledPeriods();
                for (Integer period : periods) {
                    String staffKey = slotKey(staff.getId(), day, period);
                    String sectionKey = slotKey(section.getId(), day, period);
                    if (occupiedStaffSlots.contains(staffKey) || occupiedSectionSlots.contains(sectionKey)) {
                        continue;
                    }

                    TimetableEntry entry = TimetableEntry.builder()
                            .subject(subject)
                            .section(section)
                            .staff(staff)
                            .day(day)
                            .period(period)
                            .build();
                    try {
                        timetableEntryRepository.saveAndFlush(entry);
                        occupiedStaffSlots.add(staffKey);
                        occupiedSectionSlots.add(sectionKey);
                        created++;
                        classesNeeded--;
                        break;
                    } catch (DataIntegrityViolationException conflict) {
                        // DB-level unique constraint caught a conflict the in-memory check missed.
                        skipped++;
                    }
                }
            }

            if (classesNeeded > 0) {
                errors.add("Could only schedule %d of %d sessions for subject '%s' in section '%s'"
                        .formatted(subject.getCredits() - classesNeeded, subject.getCredits(),
                                subject.getName(), section.getName()));
            }
        }

        return new SectionScheduleResult(created, skipped, errors);
    }

    private record SectionScheduleResult(int created, int skipped, List<String> errors) {
    }

    /**
     * Validates each selected elective actually belongs to this course and
     * semester and is really an ELECTIVE — rejects rather than silently
     * dropping a bad id, same as the rest of this codebase's cross-field
     * validation (e.g. UserService's required-when-HOD checks).
     */
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

    /**
     * A single-section action, so a wrong-department HOD is rejected outright
     * (403) via HodScopeResolver#requireCourseAccess, same treatment as
     * AttendanceService/ResultService's single-student guards. Section.course
     * is the direct path — no need to hop through a subject or profile the
     * way the list-filtering endpoints do.
     *
     * The resolveScopeCourse short-circuit avoids forcing Section.course's
     * lazy fetch for ADMIN, same reasoning as the StudentProfile
     * short-circuit in AttendanceService/ResultService's guards.
     */
    private void requireHodScopeAllowsSection(Section section, User actor) {
        if (hodScopeResolver.resolveScopeCourse(actor) == null) {
            return;
        }
        hodScopeResolver.requireCourseAccess(actor, section.getCourse() != null ? section.getCourse().getId() : null);
    }

    /**
     * Same guard, but the course is already known directly — no need to hop
     * through a Section the way the single-section action does.
     */
    private void requireHodScopeAllowsCourse(Course course, User actor) {
        if (hodScopeResolver.resolveScopeCourse(actor) == null) {
            return;
        }
        hodScopeResolver.requireCourseAccess(actor, course.getId());
    }

    private static List<Integer> shuffledPeriods() {
        List<Integer> periods = IntStream.rangeClosed(MIN_PERIOD, MAX_PERIOD).boxed()
                .collect(Collectors.toCollection(ArrayList::new));
        Collections.shuffle(periods, ThreadLocalRandom.current());
        return periods;
    }

    private static String slotKey(Long ownerId, DayOfWeek day, Integer period) {
        return ownerId + ":" + day + ":" + period;
    }
}
