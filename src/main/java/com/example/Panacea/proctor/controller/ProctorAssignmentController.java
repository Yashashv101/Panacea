package com.example.Panacea.proctor.controller;

import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.proctor.dto.CreateProctorAssignmentRequest;
import com.example.Panacea.proctor.dto.ProctorAssignmentResponse;
import com.example.Panacea.proctor.service.ProctorAssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ProctorAssignmentResponse assign(@Valid @RequestBody CreateProctorAssignmentRequest request) {
        return proctorAssignmentService.assign(request);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('STAFF')")
    public List<ProctorAssignmentResponse> myAssignments(@AuthenticationPrincipal UserPrincipal principal) {
        return proctorAssignmentService.findByStaff(principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<ProctorAssignmentResponse> findAll() {
        return proctorAssignmentService.findAll();
    }
}
