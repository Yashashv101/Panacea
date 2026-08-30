package com.example.Panacea.feedback.service;

import com.example.Panacea.feedback.dto.FeedbackResponse;
import com.example.Panacea.feedback.dto.SubmitFeedbackRequest;
import com.example.Panacea.feedback.entity.Feedback;
import com.example.Panacea.feedback.entity.FeedbackStatus;
import com.example.Panacea.feedback.repository.FeedbackRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.HodScopeResolver;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.notifications.service.NotificationEventPublisher;
import com.example.Panacea.student.service.StudentProfileService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final UserRepository userRepository;
    private final FeedbackRepository feedbackRepository;
    private final NotificationEventPublisher notificationEventPublisher;
    private final HodScopeResolver hodScopeResolver;
    private final StudentProfileService studentProfileService;

    @Transactional
    public FeedbackResponse submit(SubmitFeedbackRequest request, Long submitterId) {
        User submitter = userRepository.findById(submitterId)
                .orElseThrow(() -> new EntityNotFoundException("User " + submitterId + " not found"));

        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .submitter(submitter)
                .message(request.message())
                .build());

        return FeedbackResponse.from(feedback);
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> findOwn(Long submitterId) {
        return feedbackRepository.findBySubmitterIdOrderByIdDesc(submitterId).stream()
                .map(FeedbackResponse::from)
                .toList();
    }

    /**
     * ADMIN sees every submission, unfiltered. An HOD is scoped to their own
     * department, same requester-role-based course resolution as
     * LeaveService#findAll (submit() only ever allows STUDENT/STAFF as
     * submitter).
     */
    @Transactional(readOnly = true)
    public List<FeedbackResponse> findAll(FeedbackStatus status, UserPrincipal principal) {
        List<Feedback> feedback = status != null
                ? feedbackRepository.findByStatusOrderByIdDesc(status)
                : feedbackRepository.findAllByOrderByIdDesc();

        feedback = hodScopeResolver.filterByHodScope(principal, feedback,
                f -> resolveCourseIdForSubmitter(f.getSubmitter()));

        return feedback.stream().map(FeedbackResponse::from).toList();
    }

    private Long resolveCourseIdForSubmitter(User submitter) {
        if (submitter.getRole() == Role.STUDENT) {
            return studentProfileService.findCourseIdForUser(submitter.getId());
        }
        if (submitter.getRole() == Role.STAFF) {
            return submitter.getStaffCourse() != null ? submitter.getStaffCourse().getId() : null;
        }
        return null;
    }

    @Transactional
    public FeedbackResponse reply(Long feedbackId, String reply, UserPrincipal principal) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new EntityNotFoundException("Feedback " + feedbackId + " not found"));
        if (feedback.getStatus() != FeedbackStatus.OPEN) {
            throw new IllegalStateException("Feedback " + feedbackId + " is not open");
        }
        requireHodScopeAllowsSubmitter(feedback.getSubmitter(), principal);

        feedback.setReply(reply);
        Feedback saved = feedbackRepository.save(feedback);

        notificationEventPublisher.publish(saved.getSubmitter().getId(),
                "Your feedback received a reply.");

        return FeedbackResponse.from(saved);
    }

    @Transactional
    public FeedbackResponse resolve(Long feedbackId, UserPrincipal principal) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new EntityNotFoundException("Feedback " + feedbackId + " not found"));
        if (feedback.getStatus() != FeedbackStatus.OPEN) {
            throw new IllegalStateException("Feedback " + feedbackId + " is not open");
        }
        requireHodScopeAllowsSubmitter(feedback.getSubmitter(), principal);

        feedback.setStatus(FeedbackStatus.RESOLVED);
        return FeedbackResponse.from(feedbackRepository.save(feedback));
    }

    /**
     * The reject-403 guard behind reply/resolve — same shape as
     * LeaveService#requireHodScopeAllowsRequester, scoped via the
     * submitter's course instead of the requester's.
     */
    private void requireHodScopeAllowsSubmitter(User submitter, UserPrincipal principal) {
        if (hodScopeResolver.resolveScopeCourse(principal) == null) {
            return;
        }
        hodScopeResolver.requireCourseAccess(principal, resolveCourseIdForSubmitter(submitter));
    }
}
