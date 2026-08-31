package com.example.Panacea.announcement.controller;

import com.example.Panacea.announcement.dto.AnnouncementResponse;
import com.example.Panacea.announcement.dto.CreateAnnouncementRequest;
import com.example.Panacea.announcement.service.AnnouncementService;
import com.example.Panacea.identity.security.UserPrincipal;
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
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @PostMapping
    @PreAuthorize("hasRole('HOD')")
    @ResponseStatus(HttpStatus.CREATED)
    public AnnouncementResponse create(@Valid @RequestBody CreateAnnouncementRequest request,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        return announcementService.createAnnouncement(request, principal);
    }

    @GetMapping
    @PreAuthorize("hasRole('HOD')")
    public List<AnnouncementResponse> findDepartmentAnnouncements(@AuthenticationPrincipal UserPrincipal principal) {
        return announcementService.findDepartmentAnnouncements(principal);
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF', 'HOD')")
    public List<AnnouncementResponse> myAnnouncements(@AuthenticationPrincipal UserPrincipal principal) {
        return announcementService.findRelevantForMe(principal);
    }
}
