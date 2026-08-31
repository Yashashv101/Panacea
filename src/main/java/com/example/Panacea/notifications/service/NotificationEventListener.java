package com.example.Panacea.notifications.service;

import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.notifications.entity.Notification;
import com.example.Panacea.notifications.event.NotificationEvent;
import com.example.Panacea.notifications.repository.NotificationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consumes {@link NotificationEvent}s and does the actual fan-out: one
 * {@code Notification} row per recipient, asynchronously and decoupled from
 * whatever action triggered the event.
 */
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    @RabbitListener(queues = "${panacea.notifications.queue}")
    @Transactional
    public void onNotificationEvent(NotificationEvent event) {
        User recipient = userRepository.findById(event.recipientId())
                .orElseThrow(() -> new EntityNotFoundException("User " + event.recipientId() + " not found"));

        notificationRepository.save(Notification.builder()
                .recipient(recipient)
                .message(event.message())
                .type(event.type() != null ? event.type() : "GENERAL")
                .build());
    }
}
