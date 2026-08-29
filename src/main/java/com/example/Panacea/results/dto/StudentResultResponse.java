package com.example.Panacea.results.dto;

import com.example.Panacea.results.entity.StudentResult;

/**
 * {@code quiz}/{@code quizMaxScore} are not read off the entity — StudentResult no
 * longer stores a quiz component. They are resolved by {@code ResultService} from
 * the student's most recent MCQ attempt for this subject and passed in here.
 * {@code quizMaxScore} is 10.0 when that quiz had rescaleToTen on, or the quiz's
 * totalPossibleMarks otherwise, so the frontend knows which scale to render.
 * Both are null when the student has no attempt yet, in which case {@code total}
 * is also null rather than silently treating a missing quiz mark as zero.
 */
public record StudentResultResponse(
        Long id,
        Long studentId,
        String studentName,
        Long subjectId,
        String subjectName,
        Long semesterId,
        String semesterLabel,
        Double test1,
        Double test2,
        Double quiz,
        Double quizMaxScore,
        Double experiential,
        Double see,
        Double total
) {
    public static StudentResultResponse from(StudentResult result, Double quizScore, Double quizMaxScore) {
        Double total = quizScore == null
                ? null
                : result.getTest1() + result.getTest2() + quizScore + result.getExperiential() + result.getSee();
        return new StudentResultResponse(
                result.getId(),
                result.getStudent().getId(),
                result.getStudent().getFirstName() + " " + result.getStudent().getLastName(),
                result.getSubject().getId(),
                result.getSubject().getName(),
                result.getSemester().getId(),
                result.getSemester().getLabel(),
                result.getTest1(),
                result.getTest2(),
                quizScore,
                quizMaxScore,
                result.getExperiential(),
                result.getSee(),
                total);
    }
}
