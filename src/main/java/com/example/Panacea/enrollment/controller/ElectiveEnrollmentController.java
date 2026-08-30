package com.example.Panacea.enrollment.controller;

import com.example.Panacea.academic.dto.SubjectResponse;
import com.example.Panacea.enrollment.dto.ElectiveEnrollmentResponse;
import com.example.Panacea.enrollment.dto.SubmitElectiveEnrollmentRequest;
import com.example.Panacea.enrollment.service.ElectiveEnrollmentService;
import com.example.Panacea.identity.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/enrollment")
@RequiredArgsConstructor
public class ElectiveEnrollmentController {

    private final ElectiveEnrollmentService electiveEnrollmentService;

    @GetMapping("/electives")
    @PreAuthorize("hasRole('STUDENT')")
    public List<SubjectResponse> availableElectives(@AuthenticationPrincipal UserPrincipal principal) {
        return electiveEnrollmentService.findAvailableElectives(principal.getId());
    }

    @PostMapping("/requests")
    @PreAuthorize("hasRole('STUDENT')")
    @ResponseStatus(HttpStatus.CREATED)
    public ElectiveEnrollmentResponse submit(@Valid @RequestBody SubmitElectiveEnrollmentRequest request,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        return electiveEnrollmentService.submit(request, principal.getId());
    }

    @GetMapping("/requests/me")
    @PreAuthorize("hasRole('STUDENT')")
    public List<ElectiveEnrollmentResponse> myRequests(@AuthenticationPrincipal UserPrincipal principal) {
        return electiveEnrollmentService.findOwn(principal.getId());
    }

    @GetMapping("/requests/pending")
    @PreAuthorize("hasRole('STAFF')")
    public List<ElectiveEnrollmentResponse> pendingForMentor(@AuthenticationPrincipal UserPrincipal principal) {
        return electiveEnrollmentService.findPendingForMentor(principal.getId());
    }

    @GetMapping("/requests/unassigned")
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD')")
    public List<ElectiveEnrollmentResponse> unassignedPending() {
        return electiveEnrollmentService.findUnassignedPending();
    }

    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ElectiveEnrollmentResponse approve(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return electiveEnrollmentService.approve(id, principal.getId());
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ElectiveEnrollmentResponse reject(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return electiveEnrollmentService.reject(id, principal.getId());
    }
}
