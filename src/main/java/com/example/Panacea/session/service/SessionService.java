package com.example.Panacea.session.service;

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

    private final SessionRepository sessionRepository;

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
        return sessionRepository.save(Session.builder()
                .startYear(request.startYear())
                .endYear(request.endYear())
                .build());
    }

    @Transactional
    public Session update(Long id, SessionRequest request) {
        validate(request);
        Session session = findById(id);
        session.setStartYear(request.startYear());
        session.setEndYear(request.endYear());
        return session;
    }

    @Transactional
    public void delete(Long id) {
        if (!sessionRepository.existsById(id)) {
            throw new EntityNotFoundException("Session " + id + " not found");
        }
        sessionRepository.deleteById(id);
    }

    private void validate(SessionRequest request) {
        if (!request.endYear().isAfter(request.startYear())) {
            throw new IllegalArgumentException("endYear must be after startYear");
        }
    }
}
