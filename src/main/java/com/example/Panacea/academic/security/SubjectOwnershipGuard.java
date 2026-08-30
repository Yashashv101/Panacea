package com.example.Panacea.academic.security;

import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Single shared home for "is this STAFF member allowed to act on this
 * Subject" — previously duplicated verbatim as a private static method in
 * both ResultService and QuizService (see CLAUDE.md's
 * cross-cutting-authorization-guards rule for why that changed).
 *
 * A STAFF actor must be the Subject's primaryStaff; every other role
 * (ADMIN, HOD, ...) is unrestricted here — HOD's own department-scoping is a
 * separate, additional check (see identity.security.HodScopeResolver), not
 * folded into this guard.
 */
@Component
public class SubjectOwnershipGuard {

    public void requireOwnership(User actor, Subject subject) {
        if (actor.getRole() == Role.STAFF
                && (subject.getPrimaryStaff() == null || !subject.getPrimaryStaff().getId().equals(actor.getId()))) {
            throw new AccessDeniedException("You are not the primary staff for this subject");
        }
    }
}
