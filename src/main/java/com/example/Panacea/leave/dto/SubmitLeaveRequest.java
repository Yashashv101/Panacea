package com.example.Panacea.leave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record SubmitLeaveRequest(
        @NotBlank String reason,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        String attachmentPath
) {
}
