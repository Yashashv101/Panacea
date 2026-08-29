package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.SubjectType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.Set;

public record SubjectRequest(
        @NotBlank String name,
        @NotNull @Positive Integer credits,
        @NotNull SubjectType type,
        Long primaryStaffId,
        @NotNull Long semesterId,
        @NotEmpty Set<Long> courseIds,
        @NotEmpty Set<Long> sectionIds
) {
}
