package com.example.Panacea.mcq.dto;

import com.example.Panacea.mcq.entity.QuizAttempt;

import java.time.Instant;

public record QuizAttemptResponse(
        Long id,
        Long quizId,
        Long studentId,
        String studentName,
        Integer score,
        Integer totalQuestions,
        Instant submittedAt
) {
    public static QuizAttemptResponse from(QuizAttempt attempt) {
        return new QuizAttemptResponse(
                attempt.getId(),
                attempt.getQuiz().getId(),
                attempt.getStudent().getId(),
                attempt.getStudent().getFirstName() + " " + attempt.getStudent().getLastName(),
                attempt.getScore(),
                attempt.getQuiz().getQuestions().size(),
                attempt.getSubmittedAt());
    }
}
