package com.example.Panacea.announcement.dto;

import com.example.Panacea.announcement.entity.Announcement;
import com.example.Panacea.announcement.entity.AnnouncementAudience;

import java.time.Instant;

public record AnnouncementResponse(
        Long id,
        Long authorId,
        String authorName,
        Long courseId,
        String courseName,
        String message,
        AnnouncementAudience audience,
        int recipientCount,
        Instant createdAt
) {
    public static AnnouncementResponse from(Announcement announcement, int recipientCount) {
        return new AnnouncementResponse(
                announcement.getId(),
                announcement.getAuthor().getId(),
                announcement.getAuthor().getFirstName() + " " + announcement.getAuthor().getLastName(),
                announcement.getCourse().getId(),
                announcement.getCourse().getName(),
                announcement.getMessage(),
                announcement.getAudience(),
                recipientCount,
                announcement.getCreatedAt());
    }

    public static AnnouncementResponse from(Announcement announcement) {
        return from(announcement, 0);
    }
}
