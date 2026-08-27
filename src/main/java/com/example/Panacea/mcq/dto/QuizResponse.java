package com.example.Panacea.mcq.dto;

import com.example.Panacea.mcq.entity.Quiz;

import java.util.List;

/**
 * Never includes {@code correctOptionIndex} — that would let a student read the
 * answer key before attempting the quiz. See {@link QuizAttemptResponse} for the
 * post-submission score.
 */
public record QuizResponse(
        Long id,
        String title,
        Long subjectId,
        String subjectName,
        Long staffId,
        List<QuestionResponse> questions
) {
    public record QuestionResponse(Long id, String text, List<String> options) {
        public static QuestionResponse from(com.example.Panacea.mcq.entity.Question question) {
            return new QuestionResponse(question.getId(), question.getText(), question.getOptions());
        }
    }

    public static QuizResponse from(Quiz quiz) {
        return new QuizResponse(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getSubject().getId(),
                quiz.getSubject().getName(),
                quiz.getStaff().getId(),
                quiz.getQuestions().stream().map(QuestionResponse::from).toList());
    }
}
