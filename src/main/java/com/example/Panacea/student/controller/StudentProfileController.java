package com.example.Panacea.student.controller;

import com.example.Panacea.academic.dto.SubjectResponse;
import com.example.Panacea.identity.dto.UserResponse;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.student.dto.StudentLookupResponse;
import com.example.Panacea.student.service.StudentProfileService;
import com.example.Panacea.timetable.dto.TimetableEntryResponse;
import com.example.Panacea.timetable.service.TimetableService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentProfileController {

    private final StudentProfileService studentProfileService;
    private final TimetableService timetableService;

    /**
     * The real, section-filtered roster — replaces "GET /api/users?role=STUDENT"
     * (every student, regardless of section) at the Mark Attendance / Enter
     * Results call sites.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public List<UserResponse> findBySection(@RequestParam Long sectionId) {
        return studentProfileService.findStudentsInSection(sectionId);
    }

    /**
     * The ADMIN/HOD "look up a student by email" feature — HOD-scoped via the
     * shared HodScopeResolver mechanism (see StudentProfileService#findByEmail),
     * same as every other HOD-facing endpoint. A miss and an out-of-department
     * hit both surface as this same 404, not a distinguishable 403 — see that
     * method's javadoc for why.
     */
    @GetMapping("/by-email")
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD')")
    public StudentLookupResponse findByEmail(@RequestParam String email, @AuthenticationPrincipal UserPrincipal principal) {
        return studentProfileService.findByEmail(email, principal)
                .orElseThrow(() -> new EntityNotFoundException("No student found with email " + email));
    }

    /**
     * The student dashboard's real subject list — core subjects (Course + Semester +
     * type=CORE) plus approved electives — replacing the old "GET /api/subjects" (every
     * subject in the system) workaround.
     */
    @GetMapping("/me/subjects")
    @PreAuthorize("hasRole('STUDENT')")
    public List<SubjectResponse> mySubjects(@AuthenticationPrincipal UserPrincipal principal) {
        return studentProfileService.findMySubjects(principal.getId());
    }

    /**
     * The SubjectDetail page's guarded entry point: 404 if the subject doesn't exist,
     * 403 (AccessDeniedException, handled globally) if it exists but isn't the student's.
     */
    @GetMapping("/me/subjects/{subjectId}")
    @PreAuthorize("hasRole('STUDENT')")
    public SubjectResponse mySubject(@PathVariable Long subjectId, @AuthenticationPrincipal UserPrincipal principal) {
        return studentProfileService.getAccessibleSubject(principal.getId(), subjectId);
    }

    /**
     * The student dashboard's timetable view — only entries an admin has
     * explicitly published (see TimetableService#publishForCourse) for this
     * student's own section, resolved server-side, never a caller-supplied
     * sectionId.
     */
    @GetMapping("/me/timetable")
    @PreAuthorize("hasRole('STUDENT')")
    public List<TimetableEntryResponse> myTimetable(@AuthenticationPrincipal UserPrincipal principal) {
        return timetableService.findMyTimetable(principal.getId());
    }
}
