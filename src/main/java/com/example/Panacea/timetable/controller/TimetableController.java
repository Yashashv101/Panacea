package com.example.Panacea.timetable.controller;

import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.timetable.dto.GenerateTimetableRequest;
import com.example.Panacea.timetable.dto.TimetableEntryResponse;
import com.example.Panacea.timetable.dto.TimetableGenerationResponse;
import com.example.Panacea.timetable.service.TimetableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/timetable")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;

    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public TimetableGenerationResponse generate(@Valid @RequestBody GenerateTimetableRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        return timetableService.generate(request, principal.getId());
    }

    @GetMapping("/section/{sectionId}")
    public List<TimetableEntryResponse> findBySection(@PathVariable Long sectionId) {
        return timetableService.findBySection(sectionId).stream().map(TimetableEntryResponse::from).toList();
    }

    @GetMapping("/staff/{staffId}")
    public List<TimetableEntryResponse> findByStaff(@PathVariable Long staffId) {
        return timetableService.findByStaff(staffId).stream().map(TimetableEntryResponse::from).toList();
    }
}
