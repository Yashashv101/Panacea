package com.example.Panacea.academic.service;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.dto.SemesterRequest;
import com.example.Panacea.academic.repository.SemesterRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SemesterService {

    private final SemesterRepository semesterRepository;

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
                .build());
    }

    @Transactional
    public Semester update(Long id, SemesterRequest request) {
        Semester semester = findById(id);
        semester.setNumber(request.number());
        semester.setLabel(request.label());
        return semester;
    }

    @Transactional
    public void delete(Long id) {
        if (!semesterRepository.existsById(id)) {
            throw new EntityNotFoundException("Semester " + id + " not found");
        }
        semesterRepository.deleteById(id);
    }
}
