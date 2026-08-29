package com.example.Panacea.attendance.controller;

import com.example.Panacea.attendance.dto.AttendanceHistoryEntryResponse;
import com.example.Panacea.attendance.dto.AttendancePercentageResponse;
import com.example.Panacea.attendance.dto.AttendanceResponse;
import com.example.Panacea.attendance.dto.MarkAttendanceRequest;
import com.example.Panacea.attendance.service.AttendanceService;
import com.example.Panacea.identity.security.UserPrincipal;
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
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/mark")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public AttendanceResponse markAttendance(@Valid @RequestBody MarkAttendanceRequest request,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        return attendanceService.markAttendance(request, principal.getId());
    }

    @GetMapping("/percentage/student/{studentId}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public AttendancePercentageResponse percentageForStudent(@PathVariable Long studentId,
                                                               @RequestParam Long subjectId) {
        return attendanceService.computePercentage(studentId, subjectId);
    }

    @GetMapping("/percentage/me")
    @PreAuthorize("hasRole('STUDENT')")
    public AttendancePercentageResponse myPercentage(@RequestParam Long subjectId,
                                                       @AuthenticationPrincipal UserPrincipal principal) {
        return attendanceService.computePercentage(principal.getId(), subjectId);
    }

    @GetMapping("/history/me")
    @PreAuthorize("hasRole('STUDENT')")
    public List<AttendanceHistoryEntryResponse> myHistory(@RequestParam Long subjectId,
                                                            @AuthenticationPrincipal UserPrincipal principal) {
        return attendanceService.getHistory(principal.getId(), subjectId);
    }
}
