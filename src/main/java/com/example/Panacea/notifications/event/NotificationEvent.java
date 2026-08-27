package com.example.Panacea.notifications.event;

import java.io.Serializable;

/**
 * Message published to RabbitMQ whenever something happens that a user should be
 * notified about. The listener is what actually fans this out into a
 * {@code Notification} row — publishing this event does not touch the database.
 */
public record NotificationEvent(Long recipientId, String message) implements Serializable {
}
