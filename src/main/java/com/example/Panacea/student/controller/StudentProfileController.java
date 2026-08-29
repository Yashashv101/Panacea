package com.example.Panacea.student.controller;

import com.example.Panacea.academic.dto.SubjectResponse;
import com.example.Panacea.identity.dto.UserResponse;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.student.service.StudentProfileService;
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
}
