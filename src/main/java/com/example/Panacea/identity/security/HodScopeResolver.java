package com.example.Panacea.identity.security;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Function;

/**
 * Single source of truth for "what Course is the acting HOD scoped to, and
 * does a given resource belong to it" — the shared methods every
 * department-scoped endpoint calls instead of reimplementing the
 * HOD-vs-ADMIN distinction itself: GET /api/users, Leave, Feedback, Proctor,
 * Attendance oversight, Results oversight, quiz attempts, fees payments
 * overview, elective unassigned queue, timetable generate.
 *
 * ADMIN (and every other role) is unscoped — {@link #resolveScopeCourse}
 * returns null, meaning "no course restriction, see everything" — while HOD
 * is scoped to their own hodCourse.
 *
 * Prior to this cleanup, each of the 9 non-UserService endpoints reimplemented
 * its own local "resolve scope, then compare/filter" guard — see CLAUDE.md's
 * cross-cutting-authorization-guards rule for why that changed. What's left
 * local to each service is genuinely different per entity: resolving *which*
 * course a specific resource belongs to (a requester's StudentProfile vs.
 * staffCourse, a payment's own course column, a section's course, ...). Only
 * the "check/filter against the HOD's scope" half is shared here.
 *
 * principal.getUser() is loaded fresh from the DB on every request (see
 * CustomUserDetailsService#loadUserByUsername, called per-request by
 * JwtAuthenticationFilter) — so the hodCourse read here is always current,
 * never a stale claim baked into the JWT at login time.
 */
@Component
public class HodScopeResolver {

    public Course resolveScopeCourse(UserPrincipal principal) {
        return resolveScopeCourse(principal.getUser());
    }

    /**
     * Same resolution, for the many service methods (ResultService, QuizService,
     * FeePaymentService, TimetableService, ...) that already load their own
     * {@code User actor} from an {@code actorId} rather than receiving a
     * {@link UserPrincipal} — this overload lets them reuse the already-loaded
     * entity instead of threading UserPrincipal through every method signature.
     */
    public Course resolveScopeCourse(User user) {
        if (user.getRole() == Role.HOD) {
            return user.getHodCourse();
        }
        return null;
    }

    /**
     * The shared guard behind every reject-403 (single-resource) endpoint:
     * Attendance oversight, Results oversight, quiz attempts, timetable
     * generate. No-ops for ADMIN (and anyone else resolveScopeCourse returns
     * null for). For HOD, throws unless resourceCourseId matches their own
     * hodCourse — a null resourceCourseId (the resource has no department of
     * its own, e.g. an unassigned staffCourse) never matches and is rejected.
     */
    public void requireCourseAccess(UserPrincipal principal, Long resourceCourseId) {
        requireCourseAccess(principal.getUser(), resourceCourseId);
    }

    public void requireCourseAccess(User user, Long resourceCourseId) {
        Course scope = resolveScopeCourse(user);
        if (scope == null) {
            return;
        }
        if (resourceCourseId == null || !scope.getId().equals(resourceCourseId)) {
            throw new AccessDeniedException("This resource belongs to a different department");
        }
    }

    /**
     * The shared guard behind every filter (list) endpoint: Leave, Feedback,
     * Proctor, fees payments overview, elective unassigned queue. Returns
     * {@code items} unfiltered for ADMIN — courseIdExtractor is never invoked
     * in that case, so an unscoped caller never pays for (or risks failing on)
     * a per-item course lookup it doesn't need. For HOD, returns only the
     * items whose extracted course id matches their own hodCourse; an item
     * whose extractor returns null never matches.
     */
    public <T> List<T> filterByHodScope(UserPrincipal principal, List<T> items, Function<T, Long> courseIdExtractor) {
        return filterByHodScope(principal.getUser(), items, courseIdExtractor);
    }

    public <T> List<T> filterByHodScope(User user, List<T> items, Function<T, Long> courseIdExtractor) {
        Course scope = resolveScopeCourse(user);
        if (scope == null) {
            return items;
        }
        return items.stream()
                .filter(item -> scope.getId().equals(courseIdExtractor.apply(item)))
                .toList();
    }
}
