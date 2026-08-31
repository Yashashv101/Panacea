package com.example.Panacea.notifications.dto;

import com.example.Panacea.notifications.entity.Notification;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        String message,
        String type,
        Instant createdAt
) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getMessage(),
                notification.getType() != null ? notification.getType() : "GENERAL",
                notification.getCreatedAt());
    }
}
