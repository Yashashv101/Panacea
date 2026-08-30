package com.example.Panacea.identity.security;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.identity.entity.Role;
import org.springframework.stereotype.Component;

/**
 * Single source of truth for "what Course is the acting HOD scoped to" — the
 * shared method every (b)-candidate endpoint from the Phase A endpoint
 * classification list calls instead of reimplementing the HOD-vs-ADMIN
 * distinction itself: GET /api/users, Leave, Feedback, Proctor, Attendance
 * oversight, Results oversight, quiz attempts, fees payments overview,
 * elective unassigned queue, timetable generate.
 *
 * ADMIN (and every other role) is unscoped — null means "no course
 * restriction, see everything" — while HOD is scoped to their own
 * hodCourse. Only GET /api/users (see UserService#listUsers) actually
 * applies this as a filter yet; the other nine endpoints only had their
 * @PreAuthorize widened to let HOD past the role gate this session, with no
 * filtering logic wired in.
 *
 * principal.getUser() is loaded fresh from the DB on every request (see
 * CustomUserDetailsService#loadUserByUsername, called per-request by
 * JwtAuthenticationFilter) — so the hodCourse read here is always current,
 * never a stale claim baked into the JWT at login time.
 */
@Component
public class HodScopeResolver {

    public Course resolveScopeCourse(UserPrincipal principal) {
        if (principal.getUser().getRole() == Role.HOD) {
            return principal.getUser().getHodCourse();
        }
        return null;
    }
}
