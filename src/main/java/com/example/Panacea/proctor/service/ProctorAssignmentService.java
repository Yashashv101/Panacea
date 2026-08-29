package com.example.Panacea.proctor.service;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.proctor.dto.CreateProctorAssignmentRequest;
import com.example.Panacea.proctor.dto.ProctorAssignmentResponse;
import com.example.Panacea.proctor.entity.AssignmentType;
import com.example.Panacea.proctor.entity.ProctorAssignment;
import com.example.Panacea.proctor.repository.ProctorAssignmentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

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

        ProctorAssignment assignment = switch (request.assignmentType()) {
            case EXAM -> buildExamAssignment(staff, request);
            case MENTOR -> buildMentorAssignment(staff, request);
        };

        // The (staff, session) and (student) unique constraints are the hard guarantee
        // against a duplicate assignment slipping through a race with the checks above.
        return ProctorAssignmentResponse.from(proctorAssignmentRepository.saveAndFlush(assignment));
    }

    private ProctorAssignment buildExamAssignment(User staff, CreateProctorAssignmentRequest request) {
        if (request.examSessionReference() == null || request.examSessionReference().isBlank()) {
            throw new IllegalArgumentException("examSessionReference is required for an EXAM assignment");
        }
        if (request.studentId() != null) {
            throw new IllegalArgumentException("studentId must not be set for an EXAM assignment");
        }

        if (proctorAssignmentRepository.existsByStaffIdAndExamSessionReferenceAndAssignmentType(
                staff.getId(), request.examSessionReference(), AssignmentType.EXAM)) {
            throw new IllegalStateException("Staff " + staff.getId()
                    + " is already assigned to session " + request.examSessionReference());
        }

        long currentCaseload = proctorAssignmentRepository.countByStaffIdAndAssignmentType(
                staff.getId(), AssignmentType.EXAM);
        if (currentCaseload >= MAX_CASELOAD) {
            throw new IllegalStateException("Staff " + staff.getId()
                    + " is already at the maximum exam-session caseload of " + MAX_CASELOAD);
        }

        return ProctorAssignment.builder()
                .assignmentType(AssignmentType.EXAM)
                .staff(staff)
                .examSessionReference(request.examSessionReference())
                .build();
    }

    private ProctorAssignment buildMentorAssignment(User staff, CreateProctorAssignmentRequest request) {
        if (request.studentId() == null) {
            throw new IllegalArgumentException("studentId is required for a MENTOR assignment");
        }
        if (request.examSessionReference() != null) {
            throw new IllegalArgumentException("examSessionReference must not be set for a MENTOR assignment");
        }

        User student = userRepository.findById(request.studentId())
                .orElseThrow(() -> new EntityNotFoundException("User " + request.studentId() + " not found"));
        if (student.getRole() != Role.STUDENT) {
            throw new IllegalArgumentException("User " + request.studentId() + " is not a student");
        }

        if (proctorAssignmentRepository.findByStudentIdAndAssignmentType(student.getId(), AssignmentType.MENTOR)
                .isPresent()) {
            throw new IllegalStateException("Student " + student.getId() + " already has a mentor assigned");
        }

        long currentCaseload = proctorAssignmentRepository.countByStaffIdAndAssignmentType(
                staff.getId(), AssignmentType.MENTOR);
        if (currentCaseload >= MAX_CASELOAD) {
            throw new IllegalStateException("Staff " + staff.getId()
                    + " is already at the maximum mentee caseload of " + MAX_CASELOAD);
        }

        return ProctorAssignment.builder()
                .assignmentType(AssignmentType.MENTOR)
                .staff(staff)
                .student(student)
                .build();
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

    @Transactional(readOnly = true)
    public Optional<ProctorAssignmentResponse> findMentorForStudent(Long studentId) {
        return proctorAssignmentRepository.findByStudentIdAndAssignmentType(studentId, AssignmentType.MENTOR)
                .map(ProctorAssignmentResponse::from);
    }
}
