package com.example.Panacea.enrollment.service;

import com.example.Panacea.academic.dto.SubjectResponse;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.entity.SubjectType;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.audit.service.AuditLogService;
import com.example.Panacea.enrollment.dto.ElectiveEnrollmentResponse;
import com.example.Panacea.enrollment.dto.SubmitElectiveEnrollmentRequest;
import com.example.Panacea.enrollment.entity.ElectiveEnrollmentRequest;
import com.example.Panacea.enrollment.entity.EnrollmentStatus;
import com.example.Panacea.enrollment.repository.ElectiveEnrollmentRequestRepository;
import com.example.Panacea.fees.entity.PaymentStatus;
import com.example.Panacea.fees.repository.FeePaymentRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.notifications.service.NotificationEventPublisher;
import com.example.Panacea.proctor.dto.ProctorAssignmentResponse;
import com.example.Panacea.proctor.service.ProctorAssignmentService;
import com.example.Panacea.student.service.StudentProfileService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ElectiveEnrollmentService {

    private static final Set<EnrollmentStatus> ACTIVE_STATUSES = Set.of(
            EnrollmentStatus.PENDING, EnrollmentStatus.APPROVED);

    private final ElectiveEnrollmentRequestRepository electiveEnrollmentRequestRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final FeePaymentRepository feePaymentRepository;
    private final ProctorAssignmentService proctorAssignmentService;
    private final StudentProfileService studentProfileService;
    private final NotificationEventPublisher notificationEventPublisher;
    private final AuditLogService auditLogService;

    /**
     * Semester is resolved from the authenticated student's own StudentProfile,
     * not a caller-supplied parameter — a student can only ever see electives
     * for the semester an admin actually enrolled them in.
     */
    @Transactional(readOnly = true)
    public List<SubjectResponse> findAvailableElectives(Long studentId) {
        Long semesterId = studentProfileService.getByUserId(studentId).getSemester().getId();
        return subjectRepository.findBySemesterIdAndType(semesterId, SubjectType.ELECTIVE).stream()
                .map(SubjectResponse::from)
                .toList();
    }

    @Transactional
    public ElectiveEnrollmentResponse submit(SubmitElectiveEnrollmentRequest request, Long studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("User " + studentId + " not found"));
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new EntityNotFoundException("Subject " + request.subjectId() + " not found"));

        if (subject.getType() != SubjectType.ELECTIVE) {
            throw new IllegalArgumentException("Subject " + subject.getId() + " is not an elective");
        }

        Long semesterId = subject.getSemester().getId();
        if (!feePaymentRepository.existsByStudentIdAndSemesterIdAndStatus(studentId, semesterId, PaymentStatus.PAID)) {
            throw new IllegalStateException(
                    "Fees for semester " + semesterId + " must be paid before requesting an elective");
        }

        if (electiveEnrollmentRequestRepository.existsByStudentIdAndSubjectIdAndSemesterIdAndStatusIn(
                studentId, subject.getId(), semesterId, ACTIVE_STATUSES)) {
            throw new IllegalStateException(
                    "Student " + studentId + " already has an active request for subject " + subject.getId());
        }

        User mentor = resolveMentor(studentId);

        ElectiveEnrollmentRequest saved = electiveEnrollmentRequestRepository.save(ElectiveEnrollmentRequest.builder()
                .student(student)
                .subject(subject)
                .semester(subject.getSemester())
                .mentor(mentor)
                .build());

        return ElectiveEnrollmentResponse.from(saved);
    }

    private User resolveMentor(Long studentId) {
        return proctorAssignmentService.findMentorForStudent(studentId)
                .map(ProctorAssignmentResponse::staffId)
                .map(mentorId -> userRepository.findById(mentorId)
                        .orElseThrow(() -> new EntityNotFoundException("User " + mentorId + " not found")))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<ElectiveEnrollmentResponse> findOwn(Long studentId) {
        return electiveEnrollmentRequestRepository.findByStudentIdOrderByIdDesc(studentId).stream()
                .map(ElectiveEnrollmentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ElectiveEnrollmentResponse> findPendingForMentor(Long staffId) {
        return electiveEnrollmentRequestRepository
                .findByMentorIdAndStatusOrderByIdDesc(staffId, EnrollmentStatus.PENDING).stream()
                .map(ElectiveEnrollmentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ElectiveEnrollmentResponse> findUnassignedPending() {
        return electiveEnrollmentRequestRepository
                .findByStatusAndMentorIsNullOrderByIdDesc(EnrollmentStatus.PENDING).stream()
                .map(ElectiveEnrollmentResponse::from)
                .toList();
    }

    @Transactional
    public ElectiveEnrollmentResponse approve(Long requestId, Long actorId) {
        return decide(requestId, actorId, EnrollmentStatus.APPROVED);
    }

    @Transactional
    public ElectiveEnrollmentResponse reject(Long requestId, Long actorId) {
        return decide(requestId, actorId, EnrollmentStatus.REJECTED);
    }

    private ElectiveEnrollmentResponse decide(Long requestId, Long actorId, EnrollmentStatus decision) {
        ElectiveEnrollmentRequest enrollmentRequest = electiveEnrollmentRequestRepository.findById(requestId)
                .orElseThrow(() -> new EntityNotFoundException("Elective enrollment request " + requestId + " not found"));
        if (enrollmentRequest.getStatus() != EnrollmentStatus.PENDING) {
            throw new IllegalStateException("Elective enrollment request " + requestId + " has already been decided");
        }

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("User " + actorId + " not found"));
        requireMentorOwnership(actor, enrollmentRequest);

        enrollmentRequest.setStatus(decision);
        enrollmentRequest.setDecidedAt(Instant.now());
        ElectiveEnrollmentRequest saved = electiveEnrollmentRequestRepository.save(enrollmentRequest);

        auditLogService.record(actor, "ELECTIVE_ENROLLMENT_" + decision.name(), "ElectiveEnrollmentRequest",
                saved.getId(), "Elective enrollment request for student " + saved.getStudent().getId()
                        + " in subject " + saved.getSubject().getId() + " " + decision.name().toLowerCase());

        notificationEventPublisher.publish(saved.getStudent().getId(),
                "Your elective request for " + saved.getSubject().getName()
                        + " has been " + decision.name().toLowerCase() + ".");

        return ElectiveEnrollmentResponse.from(saved);
    }

    private void requireMentorOwnership(User actor, ElectiveEnrollmentRequest enrollmentRequest) {
        if (actor.getRole() != Role.STAFF) {
            return;
        }
        boolean isMentor = proctorAssignmentService.findMentorForStudent(enrollmentRequest.getStudent().getId())
                .map(ProctorAssignmentResponse::staffId)
                .map(actor.getId()::equals)
                .orElse(false);
        if (!isMentor) {
            throw new AccessDeniedException("You are not the assigned mentor for this student");
        }
    }
}
