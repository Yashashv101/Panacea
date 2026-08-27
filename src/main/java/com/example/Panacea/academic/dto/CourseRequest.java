package com.example.Panacea.academic.dto;

import jakarta.validation.constraints.NotBlank;

public record CourseRequest(@NotBlank String name) {
}
