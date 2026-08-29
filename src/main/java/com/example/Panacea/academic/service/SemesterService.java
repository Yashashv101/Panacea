package com.example.Panacea.academic.service;

import com.example.Panacea.academic.entity.Semester;
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

    @Transactional
    public Semester create(SemesterRequest request) {
        if (semesterRepository.existsByNumber(request.number())) {
            throw new IllegalArgumentException("Semester " + request.number() + " already exists");
        }
        return semesterRepository.save(Semester.builder()
                .number(request.number())
                .label(request.label())
                .session(resolveSession(request.sessionId()))
                .build());
    }

    @Transactional
    public Semester update(Long id, SemesterRequest request) {
        Semester semester = findById(id);
        semester.setNumber(request.number());
        semester.setLabel(request.label());
        semester.setSession(resolveSession(request.sessionId()));
        return semester;
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
