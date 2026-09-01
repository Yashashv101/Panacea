package com.example.Panacea.academic.security;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.SubjectStaffAssignmentRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Single shared home for "is this STAFF member allowed to act on this
 * Subject" — previously duplicated verbatim as a private static method in
 * both ResultService and QuizService (see CLAUDE.md's
 * cross-cutting-authorization-guards rule for why that changed).
 *
 * A STAFF actor must be an assigned staff member for the Subject (in
 * SubjectStaffAssignment or as primaryStaff); every other role
 * (ADMIN, HOD, ...) is unrestricted here — HOD's own department-scoping is a
 * separate, additional check (see identity.security.HodScopeResolver), not
 * folded into this guard.
 */
@Component
@RequiredArgsConstructor
public class SubjectOwnershipGuard {

    private final SubjectStaffAssignmentRepository assignmentRepository;

    public void requireOwnership(User actor, Subject subject) {
        if (actor.getRole() == Role.STAFF) {
            boolean isPrimary = subject.getPrimaryStaff() != null && subject.getPrimaryStaff().getId().equals(actor.getId());
            boolean isAssigned = assignmentRepository.existsBySubjectIdAndStaffId(subject.getId(), actor.getId());
            if (!isPrimary && !isAssigned) {
                throw new AccessDeniedException("You are not an assigned staff member for this subject");
            }
        }
    }

    public void requireOwnership(User actor, Subject subject, Long sectionId) {
        if (actor.getRole() == Role.STAFF) {
            if (sectionId != null) {
                var assignmentOpt = assignmentRepository.findBySubjectIdAndSectionId(subject.getId(), sectionId);
                if (assignmentOpt.isPresent()) {
                    if (!assignmentOpt.get().getStaff().getId().equals(actor.getId())) {
                        throw new AccessDeniedException("You are not assigned to teach this section for this subject");
                    }
                    return;
                }
            }
            requireOwnership(actor, subject);
        }
    }

    /**
     * Enforces that a staff member's own department ({@code User.staffCourse})
     * matches at least one of a subject's linked courses — the shared home
     * for a rule previously reimplemented independently in both
     * SubjectService (primary-staff assignment on create/update) and
     * SubjectStaffAssignmentService (per-section staff assignment). A staff
     * member with no department set, or a subject with no linked courses,
     * skips the check rather than rejecting — matching both call sites'
     * prior behavior.
     */
    public void requireSameDepartment(User staff, Set<Course> subjectCourses, String subjectName, String action) {
        if (staff.getStaffCourse() == null || subjectCourses == null || subjectCourses.isEmpty()) {
            return;
        }
        boolean matches = subjectCourses.stream()
                .anyMatch(c -> c.getId().equals(staff.getStaffCourse().getId()));
        if (!matches) {
            throw new IllegalArgumentException("Staff member " + staff.getFirstName() + " " + staff.getLastName() +
                    " belongs to department " + staff.getStaffCourse().getName() +
                    " and cannot be " + action + " subject " + subjectName);
        }
    }
}
