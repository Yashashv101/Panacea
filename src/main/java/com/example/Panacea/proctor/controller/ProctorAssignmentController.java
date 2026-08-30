package com.example.Panacea.proctor.controller;

import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.proctor.dto.CreateProctorAssignmentRequest;
import com.example.Panacea.proctor.dto.MenteeResponse;
import com.example.Panacea.proctor.dto.ProctorAssignmentResponse;
import com.example.Panacea.proctor.service.ProctorAssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/proctor/assignments")
@RequiredArgsConstructor
public class ProctorAssignmentController {

    private final ProctorAssignmentService proctorAssignmentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD')")
    @ResponseStatus(HttpStatus.CREATED)
    public ProctorAssignmentResponse assign(@Valid @RequestBody CreateProctorAssignmentRequest request,
                                             @AuthenticationPrincipal UserPrincipal principal) {
        return proctorAssignmentService.assign(request, principal);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('STAFF')")
    public List<ProctorAssignmentResponse> myAssignments(@AuthenticationPrincipal UserPrincipal principal) {
        return proctorAssignmentService.findByStaff(principal.getId());
    }

    /**
     * The staff "My Mentees" roster — MENTOR assignments only, enriched with
     * course/section/fee status/subjects. See ProctorAssignmentService#findMenteesForStaff.
     */
    @GetMapping("/my-mentees")
    @PreAuthorize("hasRole('STAFF')")
    public List<MenteeResponse> myMentees(@AuthenticationPrincipal UserPrincipal principal) {
        return proctorAssignmentService.findMenteesForStaff(principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD')")
    public List<ProctorAssignmentResponse> findAll(@AuthenticationPrincipal UserPrincipal principal) {
        return proctorAssignmentService.findAll(principal);
    }

    /**
     * A student's own MENTOR assignment, if an admin has made one — absence of
     * one is a valid state (not yet assigned), represented as 204, not a 404.
     * Path is distinct from GET /me above (STAFF's own caseload) since a route
     * can't dispatch on role, only @PreAuthorize can gate it after matching.
     */
    @GetMapping("/my-mentor")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ProctorAssignmentResponse> myMentor(@AuthenticationPrincipal UserPrincipal principal) {
        return proctorAssignmentService.findMentorForStudent(principal.getId())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
