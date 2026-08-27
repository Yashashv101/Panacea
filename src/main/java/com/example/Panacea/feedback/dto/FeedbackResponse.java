package com.example.Panacea.feedback.dto;

import com.example.Panacea.feedback.entity.Feedback;
import com.example.Panacea.feedback.entity.FeedbackStatus;

public record FeedbackResponse(
        Long id,
        Long submitterId,
        String submitterName,
        String message,
        String reply,
        FeedbackStatus status
) {
    public static FeedbackResponse from(Feedback feedback) {
        return new FeedbackResponse(
                feedback.getId(),
                feedback.getSubmitter().getId(),
                feedback.getSubmitter().getFirstName() + " " + feedback.getSubmitter().getLastName(),
                feedback.getMessage(),
                feedback.getReply(),
                feedback.getStatus());
    }
}
