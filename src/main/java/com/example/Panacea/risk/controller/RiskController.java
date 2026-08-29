package com.example.Panacea.risk.controller;

import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.risk.dto.RiskSnapshotResponse;
import com.example.Panacea.risk.dto.StudentRiskResponse;
import com.example.Panacea.risk.service.RiskScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/risk")
@RequiredArgsConstructor
public class RiskController {

    private final RiskScoringService riskScoringService;

    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public StudentRiskResponse myRisk(@AuthenticationPrincipal UserPrincipal principal) {
        return riskScoringService.computeRisk(principal.getId());
    }

    @GetMapping("/me/history")
    @PreAuthorize("hasRole('STUDENT')")
    public List<RiskSnapshotResponse> myRiskHistory(@AuthenticationPrincipal UserPrincipal principal) {
        return riskScoringService.getHistory(principal.getId());
    }

    @GetMapping("/students/{studentId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public StudentRiskResponse riskForStudent(@PathVariable Long studentId) {
        return riskScoringService.computeRisk(studentId);
    }

    @GetMapping("/students/{studentId}/history")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public List<RiskSnapshotResponse> riskHistoryForStudent(@PathVariable Long studentId) {
        return riskScoringService.getHistory(studentId);
    }

    @GetMapping("/at-risk")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public List<StudentRiskResponse> atRiskStudents() {
        return riskScoringService.listAtRiskStudents();
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public List<StudentRiskResponse> allStudentsRisk() {
        return riskScoringService.listAllStudentsRisk();
    }
}
