package com.example.Panacea.results.dto;

import com.example.Panacea.results.entity.StudentResult;

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
        Double experiential,
        Double see,
        Double total
) {
    public static StudentResultResponse from(StudentResult result) {
        double total = result.getTest1() + result.getTest2() + result.getQuiz()
                + result.getExperiential() + result.getSee();
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
                result.getQuiz(),
                result.getExperiential(),
                result.getSee(),
                total);
    }
}
