package com.example.Panacea.proctor.service;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.proctor.dto.CreateProctorAssignmentRequest;
import com.example.Panacea.proctor.dto.ProctorAssignmentResponse;
import com.example.Panacea.proctor.entity.ProctorAssignment;
import com.example.Panacea.proctor.repository.ProctorAssignmentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProctorAssignmentService {

    private static final int MAX_CASELOAD = 25;

    private final ProctorAssignmentRepository proctorAssignmentRepository;
    private final UserRepository userRepository;

    @Transactional
    public ProctorAssignmentResponse assign(CreateProctorAssignmentRequest request) {
        User staff = userRepository.findById(request.staffId())
                .orElseThrow(() -> new EntityNotFoundException("User " + request.staffId() + " not found"));
        if (staff.getRole() != Role.STAFF) {
            throw new IllegalArgumentException("User " + request.staffId() + " is not a staff member");
        }

        if (proctorAssignmentRepository.existsByStaffIdAndExamSessionReference(
                staff.getId(), request.examSessionReference())) {
            throw new IllegalStateException("Staff " + staff.getId()
                    + " is already assigned to session " + request.examSessionReference());
        }

        long currentCaseload = proctorAssignmentRepository.countByStaffId(staff.getId());
        if (currentCaseload >= MAX_CASELOAD) {
            throw new IllegalStateException("Staff " + staff.getId()
                    + " is already at the maximum proctor caseload of " + MAX_CASELOAD);
        }

        ProctorAssignment assignment = ProctorAssignment.builder()
                .staff(staff)
                .examSessionReference(request.examSessionReference())
                .build();

        // The (staff, session) unique constraint is the hard guarantee against a
        // duplicate assignment slipping through a race with the check above.
        return ProctorAssignmentResponse.from(proctorAssignmentRepository.saveAndFlush(assignment));
    }

    @Transactional(readOnly = true)
    public List<ProctorAssignmentResponse> findByStaff(Long staffId) {
        return proctorAssignmentRepository.findByStaffId(staffId).stream()
                .map(ProctorAssignmentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProctorAssignmentResponse> findAll() {
        return proctorAssignmentRepository.findAll().stream().map(ProctorAssignmentResponse::from).toList();
    }
}
