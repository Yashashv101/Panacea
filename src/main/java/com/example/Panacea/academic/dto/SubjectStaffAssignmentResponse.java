package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.SubjectStaffAssignment;

public record SubjectStaffAssignmentResponse(
        Long id,
        Long subjectId,
        String subjectName,
        Long sectionId,
        String sectionName,
        Long staffId,
        String staffName,
        String staffEmail,
        Long courseId,
        String courseName,
        Long semesterId
) {
    public static SubjectStaffAssignmentResponse from(SubjectStaffAssignment assignment) {
        Course course = assignment.getSubject().getCourses().isEmpty()
                ? (assignment.getSection().getCourse() != null ? assignment.getSection().getCourse() : null)
                : assignment.getSubject().getCourses().iterator().next();

        return new SubjectStaffAssignmentResponse(
                assignment.getId(),
                assignment.getSubject().getId(),
                assignment.getSubject().getName(),
                assignment.getSection().getId(),
                assignment.getSection().getName(),
                assignment.getStaff().getId(),
                assignment.getStaff().getFirstName() + " " + assignment.getStaff().getLastName(),
                assignment.getStaff().getEmail(),
                course != null ? course.getId() : null,
                course != null ? course.getName() : null,
                assignment.getSubject().getSemester() != null ? assignment.getSubject().getSemester().getId() : null
        );
    }
}
