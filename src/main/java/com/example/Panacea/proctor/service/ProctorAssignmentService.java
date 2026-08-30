package com.example.Panacea.proctor.service;

import com.example.Panacea.fees.entity.PaymentStatus;
import com.example.Panacea.fees.repository.FeePaymentRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.HodScopeResolver;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.proctor.dto.CreateProctorAssignmentRequest;
import com.example.Panacea.proctor.dto.MenteeResponse;
import com.example.Panacea.proctor.dto.ProctorAssignmentResponse;
import com.example.Panacea.proctor.entity.AssignmentType;
import com.example.Panacea.proctor.entity.ProctorAssignment;
import com.example.Panacea.proctor.repository.ProctorAssignmentRepository;
import com.example.Panacea.student.entity.StudentProfile;
import com.example.Panacea.student.service.StudentProfileService;
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
    private final StudentProfileService studentProfileService;
    private final FeePaymentRepository feePaymentRepository;
    private final HodScopeResolver hodScopeResolver;

    @Transactional
    public ProctorAssignmentResponse assign(CreateProctorAssignmentRequest request, UserPrincipal principal) {
        User staff = userRepository.findById(request.staffId())
                .orElseThrow(() -> new EntityNotFoundException("User " + request.staffId() + " not found"));
        if (staff.getRole() != Role.STAFF) {
            throw new IllegalArgumentException("User " + request.staffId() + " is not a staff member");
        }
        requireHodScopeAllowsStaff(staff, principal);

        ProctorAssignment assignment = switch (request.assignmentType()) {
            case EXAM -> buildExamAssignment(staff, request);
            case MENTOR -> buildMentorAssignment(staff, request, principal);
        };

        // The (staff, session) and (student) unique constraints are the hard guarantee
        // against a duplicate assignment slipping through a race with the checks above.
        return ProctorAssignmentResponse.from(proctorAssignmentRepository.saveAndFlush(assignment));
    }

    /**
     * The reject-403 guard behind assign(): an HOD may only assign duty to a
     * staff member in their own department, regardless of assignmentType —
     * both EXAM and MENTOR are a duty held by staff.staffCourse, same field
     * findAll's filter already reads.
     */
    private void requireHodScopeAllowsStaff(User staff, UserPrincipal principal) {
        if (hodScopeResolver.resolveScopeCourse(principal) == null) {
            return;
        }
        Long staffCourseId = staff.getStaffCourse() != null ? staff.getStaffCourse().getId() : null;
        hodScopeResolver.requireCourseAccess(principal, staffCourseId);
    }

    /**
     * The MENTOR-only counterpart to requireHodScopeAllowsStaff above: a
     * cross-department mentor assignment isn't just an access-control gap,
     * it's a correctness bug (a mentee whose mentor is in a different
     * department is nonsensical), so the student's own course is checked
     * too — not just the staff side.
     */
    private void requireHodScopeAllowsStudent(User student, UserPrincipal principal) {
        if (hodScopeResolver.resolveScopeCourse(principal) == null) {
            return;
        }
        hodScopeResolver.requireCourseAccess(principal, studentProfileService.findCourseIdForUser(student.getId()));
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

    private ProctorAssignment buildMentorAssignment(User staff, CreateProctorAssignmentRequest request,
                                                      UserPrincipal principal) {
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
        requireHodScopeAllowsStudent(student, principal);

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

    /**
     * ADMIN sees every assignment, unfiltered. An HOD is scoped to their own
     * department via the assignment's staff.staffCourse — the same field
     * regardless of assignmentType (EXAM or MENTOR), since both kinds are
     * always a duty held by a STAFF member.
     */
    @Transactional(readOnly = true)
    public List<ProctorAssignmentResponse> findAll(UserPrincipal principal) {
        List<ProctorAssignment> assignments = proctorAssignmentRepository.findAll();

        assignments = hodScopeResolver.filterByHodScope(principal, assignments, this::staffCourseIdOf);

        return assignments.stream().map(ProctorAssignmentResponse::from).toList();
    }

    private Long staffCourseIdOf(ProctorAssignment assignment) {
        return assignment.getStaff().getStaffCourse() != null
                ? assignment.getStaff().getStaffCourse().getId() : null;
    }

    @Transactional(readOnly = true)
    public Optional<ProctorAssignmentResponse> findMentorForStudent(Long studentId) {
        return proctorAssignmentRepository.findByStudentIdAndAssignmentType(studentId, AssignmentType.MENTOR)
                .map(ProctorAssignmentResponse::from);
    }

    /**
     * The staff "My Mentees" roster: each MENTOR assignment for this staff member,
     * enriched with the student's course/section (from their StudentProfile), their
     * most recent fee payment status for their current semester, and the subjects
     * they're actually enrolled in (core + approved electives — same list
     * StudentProfileService#findMySubjects gives the student themselves). A mentee
     * with no StudentProfile row (not yet set up by an admin) is simply skipped —
     * there's no course/section/semester to report for them.
     */
    @Transactional(readOnly = true)
    public List<MenteeResponse> findMenteesForStaff(Long staffId) {
        return proctorAssignmentRepository.findByStaffIdAndAssignmentType(staffId, AssignmentType.MENTOR).stream()
                .map(ProctorAssignment::getStudent)
                .map(this::toMenteeResponse)
                .flatMap(Optional::stream)
                .toList();
    }

    private Optional<MenteeResponse> toMenteeResponse(User student) {
        StudentProfile profile;
        try {
            profile = studentProfileService.getByUserId(student.getId());
        } catch (EntityNotFoundException ex) {
            return Optional.empty();
        }

        PaymentStatus feeStatus = feePaymentRepository
                .findTopByStudentIdAndSemesterIdOrderByCreatedAtDesc(student.getId(), profile.getSemester().getId())
                .map(payment -> payment.getStatus())
                .orElse(null);

        return Optional.of(new MenteeResponse(
                student.getId(),
                student.getFirstName() + " " + student.getLastName(),
                student.getEmail(),
                profile.getCourse().getId(),
                profile.getCourse().getName(),
                profile.getSection().getId(),
                profile.getSection().getName(),
                feeStatus,
                studentProfileService.findMySubjects(student.getId())));
    }
}
