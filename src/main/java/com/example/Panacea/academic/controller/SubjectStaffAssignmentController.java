package com.example.Panacea.academic.controller;

import com.example.Panacea.academic.dto.StaffAssignedSubjectSummaryResponse;
import com.example.Panacea.academic.dto.SubjectStaffAssignmentRequest;
import com.example.Panacea.academic.dto.SubjectStaffAssignmentResponse;
import com.example.Panacea.academic.service.SubjectStaffAssignmentService;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/academic/staff-assignments")
@RequiredArgsConstructor
public class SubjectStaffAssignmentController {

    private final SubjectStaffAssignmentService assignmentService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD')")
    @ResponseStatus(HttpStatus.CREATED)
    public List<SubjectStaffAssignmentResponse> assignStaff(
            @Valid @RequestBody SubjectStaffAssignmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return assignmentService.assignStaff(request, principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD')")
    public List<SubjectStaffAssignmentResponse> findAll(
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long semesterId,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Long staffId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User actor = userRepository.findById(principal.getId()).orElse(null);
        return assignmentService.findAll(courseId, semesterId, subjectId, staffId, actor);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAssignment(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        assignmentService.deleteAssignment(id, principal.getId());
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('STAFF')")
    public List<StaffAssignedSubjectSummaryResponse> getMyAssignedSubjects(@AuthenticationPrincipal UserPrincipal principal) {
        return assignmentService.findAssignedSubjectsForStaff(principal.getId());
    }
}
