package com.example.Panacea.feedback.service;

import com.example.Panacea.feedback.dto.FeedbackResponse;
import com.example.Panacea.feedback.dto.SubmitFeedbackRequest;
import com.example.Panacea.feedback.entity.Feedback;
import com.example.Panacea.feedback.entity.FeedbackStatus;
import com.example.Panacea.feedback.repository.FeedbackRepository;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.notifications.service.NotificationEventPublisher;
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

    @Transactional
    public FeedbackResponse reply(Long feedbackId, String reply) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new EntityNotFoundException("Feedback " + feedbackId + " not found"));

        feedback.setReply(reply);
        Feedback saved = feedbackRepository.save(feedback);

        notificationEventPublisher.publish(saved.getSubmitter().getId(),
                "Your feedback received a reply.");

        return FeedbackResponse.from(saved);
    }

    @Transactional
    public FeedbackResponse resolve(Long feedbackId) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new EntityNotFoundException("Feedback " + feedbackId + " not found"));
        if (feedback.getStatus() != FeedbackStatus.OPEN) {
            throw new IllegalStateException("Feedback " + feedbackId + " is not open");
        }

        feedback.setStatus(FeedbackStatus.RESOLVED);
        return FeedbackResponse.from(feedbackRepository.save(feedback));
    }
}
