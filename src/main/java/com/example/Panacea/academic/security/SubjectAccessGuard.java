package com.example.Panacea.academic.security;

import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.student.service.StudentProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SubjectAccessGuard {

    private final StudentProfileService studentProfileService;

    /**
     * Enforces the standard per-role read/download access rules for academic subject resources:
     * - ADMIN: always allowed
     * - HOD: subject must belong to their department (any course in subject.courses matches hodCourse)
     * - STAFF: any authenticated staff member (academic content is accessible to faculty)
     * - STUDENT: must be enrolled in this subject (core for course+semester or approved elective)
     */
    public void requireReadAccess(User caller, Subject subject) {
        switch (caller.getRole()) {
            case ADMIN -> {
                // ADMIN always allowed
            }
            case HOD -> {
                Long hodCourseId = caller.getHodCourse() != null ? caller.getHodCourse().getId() : null;
                boolean inDept = subject.getCourses().stream()
                        .anyMatch(c -> c.getId().equals(hodCourseId));
                if (!inDept) {
                    throw new AccessDeniedException("This subject does not belong to your department");
                }
            }
            case STAFF -> {
                // Any authenticated STAFF is permitted
            }
            case STUDENT -> {
                if (!studentProfileService.isSubjectAccessible(caller.getId(), subject.getId())) {
                    throw new AccessDeniedException("You are not enrolled in this subject");
                }
            }
            default -> throw new AccessDeniedException("Role not permitted to access this subject resource");
        }
    }
}
