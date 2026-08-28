package com.example.Panacea.notifications.controller;

import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.notifications.dto.NotificationResponse;
import com.example.Panacea.notifications.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/me")
    public List<NotificationResponse> myNotifications(@AuthenticationPrincipal UserPrincipal principal) {
        return notificationService.findOwn(principal.getId());
    }
}
