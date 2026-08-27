package com.example.Panacea.notifications.controller;

import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.notifications.dto.NotificationResponse;
import com.example.Panacea.notifications.repository.NotificationRepository;
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

    private final NotificationRepository notificationRepository;

    @GetMapping("/me")
    public List<NotificationResponse> myNotifications(@AuthenticationPrincipal UserPrincipal principal) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(principal.getId()).stream()
                .map(NotificationResponse::from)
                .toList();
    }
}
