package com.example.Panacea.calendar.controller;

import com.example.Panacea.calendar.dto.ReminderRequest;
import com.example.Panacea.calendar.dto.ReminderResponse;
import com.example.Panacea.calendar.service.ReminderService;
import com.example.Panacea.identity.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reminders")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ReminderController {

    private final ReminderService reminderService;

    @GetMapping
    public List<ReminderResponse> getMyReminders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @AuthenticationPrincipal UserPrincipal principal) {
        return reminderService.getMyReminders(principal.getId(), start, end);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderResponse createReminder(
            @Valid @RequestBody ReminderRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return reminderService.createReminder(request, principal.getId());
    }

    @PatchMapping("/{id}/toggle")
    public ReminderResponse toggleComplete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return reminderService.toggleComplete(id, principal.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReminder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        reminderService.deleteReminder(id, principal.getId());
    }
}
