package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.entity.SubjectType;

import java.util.Set;
import java.util.stream.Collectors;

public record SubjectResponse(
        Long id,
        String name,
        Integer credits,
        SubjectType type,
        Long primaryStaffId,
        String primaryStaffName,
        Long semesterId,
        Set<Long> courseIds,
        Set<Long> sectionIds,
        /**
         * True if a syllabus PDF has been uploaded for this subject.
         * The actual file path is deliberately not exposed in this DTO —
         * downloads go through GET /api/subjects/{id}/syllabus, which
         * enforces per-role access checks before streaming the file.
         */
        boolean syllabusUploaded
) {
    public static SubjectResponse from(Subject subject) {
        return new SubjectResponse(
                subject.getId(),
                subject.getName(),
                subject.getCredits(),
                subject.getType(),
                subject.getPrimaryStaff() != null ? subject.getPrimaryStaff().getId() : null,
                subject.getPrimaryStaff() != null
                        ? subject.getPrimaryStaff().getFirstName() + " " + subject.getPrimaryStaff().getLastName()
                        : null,
                subject.getSemester().getId(),
                subject.getCourses().stream().map(Course::getId).collect(Collectors.toSet()),
                subject.getSections().stream().map(Section::getId).collect(Collectors.toSet()),
                subject.getSyllabusPath() != null);
    }
}
