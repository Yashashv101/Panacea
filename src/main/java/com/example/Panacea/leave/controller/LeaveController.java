package com.example.Panacea.leave.controller;

import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.leave.dto.LeaveRequestResponse;
import com.example.Panacea.leave.dto.SubmitLeaveRequest;
import com.example.Panacea.leave.entity.LeaveStatus;
import com.example.Panacea.leave.service.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/leave/requests")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService leaveService;

    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF')")
    public LeaveRequestResponse submit(@Valid @RequestBody SubmitLeaveRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return leaveService.submit(request, principal.getId());
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF')")
    public List<LeaveRequestResponse> myRequests(@AuthenticationPrincipal UserPrincipal principal) {
        return leaveService.findOwn(principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<LeaveRequestResponse> findAll(@RequestParam(required = false) LeaveStatus status) {
        return leaveService.findAll(status);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public LeaveRequestResponse approve(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return leaveService.approve(id, principal.getId());
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public LeaveRequestResponse reject(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return leaveService.reject(id, principal.getId());
    }
}
