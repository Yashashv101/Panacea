package com.example.Panacea.notifications.service;

import com.example.Panacea.notifications.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Publishes a {@link NotificationEvent} onto the notifications exchange. This is
 * the async fan-out trigger — it does not write a {@code Notification} row itself;
 * {@code NotificationEventListener} does that when it consumes the event.
 */
@Service
@RequiredArgsConstructor
public class NotificationEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${panacea.notifications.exchange}")
    private String exchangeName;

    @Value("${panacea.notifications.routing-key}")
    private String routingKey;

    public void publish(Long recipientId, String message) {
        publish(recipientId, message, "GENERAL");
    }

    public void publish(Long recipientId, String message, String type) {
        rabbitTemplate.convertAndSend(exchangeName, routingKey, new NotificationEvent(recipientId, message, type));
    }
}
