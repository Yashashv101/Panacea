package com.example.Panacea.leave.service;

import com.example.Panacea.audit.service.AuditLogService;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.HodScopeResolver;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.leave.dto.LeaveRequestResponse;
import com.example.Panacea.leave.dto.SubmitLeaveRequest;
import com.example.Panacea.leave.entity.LeaveRequest;
import com.example.Panacea.leave.entity.LeaveStatus;
import com.example.Panacea.leave.repository.LeaveRequestRepository;
import com.example.Panacea.notifications.service.NotificationEventPublisher;
import com.example.Panacea.student.service.StudentProfileService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final UserRepository userRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final NotificationEventPublisher notificationEventPublisher;
    private final AuditLogService auditLogService;
    private final HodScopeResolver hodScopeResolver;
    private final StudentProfileService studentProfileService;

    @Transactional
    public LeaveRequestResponse submit(SubmitLeaveRequest request, Long requesterId) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new EntityNotFoundException("User " + requesterId + " not found"));

        LeaveRequest leaveRequest = leaveRequestRepository.save(LeaveRequest.builder()
                .requester(requester)
                .reason(request.reason())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .attachmentPath(request.attachmentPath())
                .build());

        return LeaveRequestResponse.from(leaveRequest);
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestResponse> findOwn(Long requesterId) {
        return leaveRequestRepository.findByRequesterIdOrderByStartDateDesc(requesterId).stream()
                .map(LeaveRequestResponse::from)
                .toList();
    }

    /**
     * ADMIN sees every request, unfiltered. An HOD is scoped to their own
     * department: the requester's course, resolved by role (STUDENT via
     * StudentProfile.course, STAFF via staffCourse directly — submit() only
     * ever allows those two roles as requester, see SubmitLeaveRequest's
     * @PreAuthorize), must match the HOD's hodCourse.
     */
    @Transactional(readOnly = true)
    public List<LeaveRequestResponse> findAll(LeaveStatus status, UserPrincipal principal) {
        List<LeaveRequest> requests = status != null
                ? leaveRequestRepository.findByStatusOrderByStartDateDesc(status)
                : leaveRequestRepository.findAllByOrderByStartDateDesc();

        requests = hodScopeResolver.filterByHodScope(principal, requests,
                r -> resolveCourseIdForRequester(r.getRequester()));

        return requests.stream().map(LeaveRequestResponse::from).toList();
    }

    private Long resolveCourseIdForRequester(User requester) {
        if (requester.getRole() == Role.STUDENT) {
            return studentProfileService.findCourseIdForUser(requester.getId());
        }
        if (requester.getRole() == Role.STAFF) {
            return requester.getStaffCourse() != null ? requester.getStaffCourse().getId() : null;
        }
        return null;
    }

    @Transactional
    public LeaveRequestResponse approve(Long leaveRequestId, Long approverId) {
        return decide(leaveRequestId, approverId, LeaveStatus.APPROVED);
    }

    @Transactional
    public LeaveRequestResponse reject(Long leaveRequestId, Long approverId) {
        return decide(leaveRequestId, approverId, LeaveStatus.REJECTED);
    }

    private LeaveRequestResponse decide(Long leaveRequestId, Long approverId, LeaveStatus decision) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow(() -> new EntityNotFoundException("Leave request " + leaveRequestId + " not found"));
        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new IllegalStateException("Leave request " + leaveRequestId + " is not pending");
        }

        User approver = userRepository.findById(approverId)
                .orElseThrow(() -> new EntityNotFoundException("User " + approverId + " not found"));

        leaveRequest.setStatus(decision);
        leaveRequest.setApprover(approver);
        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

        auditLogService.record(approver, "LEAVE_" + decision.name(), "LeaveRequest", saved.getId(),
                "Leave request for user " + saved.getRequester().getId() + " " + decision.name().toLowerCase());

        notificationEventPublisher.publish(saved.getRequester().getId(),
                "Your leave request from " + saved.getStartDate() + " to " + saved.getEndDate()
                        + " has been " + decision.name().toLowerCase() + ".");

        return LeaveRequestResponse.from(saved);
    }
}
