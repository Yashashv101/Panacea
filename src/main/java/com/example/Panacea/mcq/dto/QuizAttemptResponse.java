package com.example.Panacea.mcq.dto;

import com.example.Panacea.mcq.entity.QuizAttempt;

import java.time.Instant;

public record QuizAttemptResponse(
        Long id,
        Long quizId,
        Long studentId,
        String studentName,
        Integer rawScore,
        Integer totalPossibleMarks,
        Double rescaledScore,
        boolean rescaleToTen,
        Instant submittedAt
) {
    public static QuizAttemptResponse from(QuizAttempt attempt) {
        return new QuizAttemptResponse(
                attempt.getId(),
                attempt.getQuiz().getId(),
                attempt.getStudent().getId(),
                attempt.getStudent().getFirstName() + " " + attempt.getStudent().getLastName(),
                attempt.getRawScore(),
                attempt.getTotalPossibleMarks(),
                attempt.getRescaledScore(),
                attempt.getQuiz().isRescaleToTen(),
                attempt.getSubmittedAt());
    }
}
