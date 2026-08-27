package com.example.Panacea.notifications;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.notifications.entity.Notification;
import com.example.Panacea.notifications.repository.NotificationRepository;
import com.example.Panacea.notifications.service.NotificationEventPublisher;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * End-to-end check of the async fan-out: publishing a NotificationEvent must
 * eventually produce a Notification row, via the real RabbitMQ round trip
 * (publisher -> broker -> @RabbitListener -> repository save) rather than a
 * synchronous call. The broker is the shared container from
 * {@link AbstractPostgresContainerTest}.
 */
@SpringBootTest
class NotificationEventFlowTest extends AbstractPostgresContainerTest {

    @Autowired
    private NotificationEventPublisher notificationEventPublisher;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void leaveApprovedEventEventuallyCreatesNotification() throws InterruptedException {
        User requester = userRepository.save(User.builder()
                .email("leave-requester@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());

        notificationEventPublisher.publish(requester.getId(),
                "Your leave request from 2026-09-01 to 2026-09-03 has been approved.");

        List<Notification> notifications = pollUntilFound(requester.getId());

        assertEquals(1, notifications.size());
        assertTrue(notifications.get(0).getMessage().contains("approved"));
    }

    private List<Notification> pollUntilFound(Long recipientId) throws InterruptedException {
        for (int attempt = 0; attempt < 20; attempt++) {
            List<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(recipientId);
            if (!notifications.isEmpty()) {
                return notifications;
            }
            Thread.sleep(250);
        }
        fail("Notification was not created within the expected time");
        return List.of();
    }
}
