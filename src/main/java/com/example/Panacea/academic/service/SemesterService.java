package com.example.Panacea.academic.service;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.SemesterParity;
import com.example.Panacea.academic.dto.SemesterRequest;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.session.entity.Session;
import com.example.Panacea.session.repository.SessionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SemesterService {

    private final SemesterRepository semesterRepository;
    private final SessionRepository sessionRepository;

    @Transactional(readOnly = true)
    public List<Semester> findAll() {
        return semesterRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Semester findById(Long id) {
        return semesterRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Semester " + id + " not found"));
    }

    @Transactional(readOnly = true)
    public Semester findBySessionAndNumber(Long sessionId, int number) {
        return semesterRepository.findBySessionIdAndNumber(sessionId, number)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Semester " + number + " not found for session " + sessionId));
    }

    @Transactional
    public Semester create(SemesterRequest request) {
        validateParity(request.number(), request.parity());
        if (semesterRepository.existsBySessionIdAndNumber(request.sessionId(), request.number())) {
            throw new IllegalArgumentException(
                    "Semester " + request.number() + " already exists for this session");
        }
        return semesterRepository.save(Semester.builder()
                .number(request.number())
                .label(request.label())
                .session(resolveSession(request.sessionId()))
                .parity(request.parity())
                .build());
    }

    @Transactional
    public Semester update(Long id, SemesterRequest request) {
        validateParity(request.number(), request.parity());
        Semester semester = findById(id);
        semester.setNumber(request.number());
        semester.setLabel(request.label());
        semester.setSession(resolveSession(request.sessionId()));
        semester.setParity(request.parity());
        return semester;
    }

    /**
     * System-level creation used by SessionService to auto-populate the
     * standard Semester set for a newly created Session — bypasses
     * SemesterRequest entirely, so parity is derived and correct by
     * construction (nothing to validate/reject here).
     */
    @Transactional
    public Semester createForSession(Session session, int number) {
        return semesterRepository.save(Semester.builder()
                .number(number)
                .label("Semester " + number)
                .session(session)
                .parity(deriveParity(number))
                .build());
    }

    /**
     * Odd numbers (1,3,5,7...) start in the academic year's first half
     * (July-Dec) and are ODD; even numbers (2,4,6,8...) start in the second
     * half (Jan-June) and are EVEN. A given number is always one or the
     * other, across every Session — never independently settable.
     */
    private void validateParity(int number, SemesterParity requestedParity) {
        SemesterParity expected = deriveParity(number);
        if (expected != requestedParity) {
            throw new IllegalArgumentException(
                    "Semester " + number + " must have parity " + expected + ", not " + requestedParity);
        }
    }

    private SemesterParity deriveParity(int number) {
        return number % 2 == 1 ? SemesterParity.ODD : SemesterParity.EVEN;
    }

    private Session resolveSession(Long sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session " + sessionId + " not found"));
    }

    @Transactional
    public void delete(Long id) {
        if (!semesterRepository.existsById(id)) {
            throw new EntityNotFoundException("Semester " + id + " not found");
        }
        semesterRepository.deleteById(id);
    }
}
