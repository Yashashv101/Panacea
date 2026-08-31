package com.example.Panacea.announcement.dto;

import com.example.Panacea.announcement.entity.AnnouncementAudience;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateAnnouncementRequest(
        @NotBlank(message = "Message cannot be blank")
        @Size(max = 2000, message = "Message must not exceed 2000 characters")
        String message,

        @NotNull(message = "Audience is required")
        AnnouncementAudience audience
) {
}
