package com.example.Panacea.session.service;

import com.example.Panacea.academic.service.SemesterService;
import com.example.Panacea.session.dto.SessionRequest;
import com.example.Panacea.session.entity.Session;
import com.example.Panacea.session.repository.SessionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SessionService {

    /**
     * Every academic year (Session) runs all SEMESTERS_PER_SESSION numbered
     * semesters concurrently — one per cohort-year of this codebase's 4-year
     * engineering programs (BE-CSE/ISE/AIML) — so a new Session auto-creates
     * its own full set rather than leaving semester creation manual. Manual
     * creation was rejected: the timetable flow needs "select session ->
     * select semester -> department" to always resolve real data, and a
     * forgotten manual follow-up (Session and Semester are separate admin
     * screens) would silently block subjects/students/timetable generation
     * for that entire session until someone noticed the empty dropdown.
     */
    private static final int SEMESTERS_PER_SESSION = 8;

    private final SessionRepository sessionRepository;
    private final SemesterService semesterService;

    @Transactional(readOnly = true)
    public List<Session> findAll() {
        return sessionRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Session findById(Long id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Session " + id + " not found"));
    }

    @Transactional
    public Session create(SessionRequest request) {
        validate(request);
        if (sessionRepository.existsByStartYearAndEndYear(request.startYear(), request.endYear())) {
            throw new IllegalArgumentException(
                    "Session " + request.startYear() + " - " + request.endYear() + " already exists");
        }
        Session session = sessionRepository.save(Session.builder()
                .startYear(request.startYear())
                .endYear(request.endYear())
                .build());
        for (int number = 1; number <= SEMESTERS_PER_SESSION; number++) {
            semesterService.createForSession(session, number);
        }
        return session;
    }

    @Transactional
    public Session update(Long id, SessionRequest request) {
        validate(request);
        Session session = findById(id);
        session.setStartYear(request.startYear());
        session.setEndYear(request.endYear());
        return session;
    }

    /**
     * Session.create() above always auto-populates SEMESTERS_PER_SESSION
     * Semesters, and Semester.session is a plain (non-cascading) FK — so for
     * every Session created through the normal flow, an unguarded delete
     * would fall through to an unhandled DataIntegrityViolationException
     * (500) instead of a clean error, the same class of hard-delete hazard
     * already fixed for Course by dropping its DELETE endpoint in favor of
     * setActive. Session has no such "inactive" concept to fall back on and
     * Semester fans out to Subject/StudentProfile/FeeStructure/Timetable/
     * Results, so cascading the delete would be far more destructive than
     * skipping it — this guard instead blocks deletion outright (as a clean
     * 409) whenever any Semester still references this Session. The only
     * Sessions this ever allows through are ones whose Semesters were all
     * separately removed first (e.g. immediately after creation, before any
     * subject/student data exists) — deleting a populated Session is not
     * meant to be possible.
     */
    @Transactional
    public void delete(Long id) {
        if (!sessionRepository.existsById(id)) {
            throw new EntityNotFoundException("Session " + id + " not found");
        }
        if (semesterService.existsForSession(id)) {
            throw new IllegalStateException(
                    "Session " + id + " has semesters attached and cannot be deleted");
        }
        sessionRepository.deleteById(id);
    }

    private void validate(SessionRequest request) {
        if (!request.endYear().isAfter(request.startYear())) {
            throw new IllegalArgumentException("endYear must be after startYear");
        }
    }
}
