package com.example.Panacea.student.dto;

import com.example.Panacea.identity.entity.User;
import com.example.Panacea.student.entity.StudentProfile;

/**
 * The HOD/ADMIN "look up a student by email" result — a User's basic identity
 * plus their StudentProfile placement (course/section/semester). Distinct
 * from UserResponse, which has no course/section/semester fields at all.
 */
public record StudentLookupResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        Long courseId,
        String courseName,
        Long sectionId,
        String sectionName,
        Long semesterId,
        String semesterLabel
) {
    public static StudentLookupResponse from(StudentProfile profile) {
        User user = profile.getUser();
        return new StudentLookupResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                profile.getCourse().getId(),
                profile.getCourse().getName(),
                profile.getSection().getId(),
                profile.getSection().getName(),
                profile.getSemester().getId(),
                profile.getSemester().getLabel());
    }
}
