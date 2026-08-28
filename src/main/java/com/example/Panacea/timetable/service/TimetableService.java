package com.example.Panacea.timetable.service;

import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.SectionRepository;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.audit.service.AuditLogService;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.timetable.dto.GenerateTimetableRequest;
import com.example.Panacea.timetable.dto.TimetableEntryResponse;
import com.example.Panacea.timetable.dto.TimetableGenerationResponse;
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
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

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
    private final TimetableEntryRepository timetableEntryRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

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

    @Transactional
    public TimetableGenerationResponse generate(GenerateTimetableRequest request, Long actorId) {
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("User " + actorId + " not found"));
        Semester semester = semesterRepository.findById(request.semesterId())
                .orElseThrow(() -> new EntityNotFoundException("Semester " + request.semesterId() + " not found"));
        Section section = sectionRepository.findById(request.sectionId())
                .orElseThrow(() -> new EntityNotFoundException("Section " + request.sectionId() + " not found"));

        List<Subject> subjects = subjectRepository
                .findBySemesterIdAndSectionsId(semester.getId(), section.getId())
                .stream()
                .filter(subject -> subject.getPrimaryStaff() != null)
                .filter(subject -> subject.getCredits() != null && subject.getCredits() > 0)
                .collect(Collectors.toCollection(ArrayList::new));
        Collections.shuffle(subjects);

        Set<String> occupiedStaffSlots = new HashSet<>();
        Set<String> occupiedSectionSlots = new HashSet<>();
        for (TimetableEntry existing : timetableEntryRepository.findBySectionIdOrderByDayAscPeriodAsc(section.getId())) {
            occupiedSectionSlots.add(slotKey(existing.getSection().getId(), existing.getDay(), existing.getPeriod()));
            occupiedStaffSlots.add(slotKey(existing.getStaff().getId(), existing.getDay(), existing.getPeriod()));
        }

        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (Subject subject : subjects) {
            User staff = subject.getPrimaryStaff();
            int classesNeeded = subject.getCredits();

            List<DayOfWeek> days = new ArrayList<>(DAYS);
            Collections.shuffle(days);

            for (DayOfWeek day : days) {
                if (classesNeeded == 0) {
                    break;
                }
                List<Integer> periods = shuffledPeriods();
                for (Integer period : periods) {
                    if (classesNeeded == 0) {
                        break;
                    }
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
                    } catch (DataIntegrityViolationException conflict) {
                        // DB-level unique constraint caught a conflict the in-memory check missed.
                        skipped++;
                    }
                }
            }

            if (classesNeeded > 0) {
                errors.add("Could only schedule %d of %d sessions for subject '%s'"
                        .formatted(subject.getCredits() - classesNeeded, subject.getCredits(), subject.getName()));
            }
        }

        auditLogService.record(actor, "TIMETABLE_REGENERATE", "Section", section.getId(),
                "Generated " + created + " entries (" + skipped + " skipped) for semester " + semester.getId());

        return new TimetableGenerationResponse(created, skipped, errors);
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
