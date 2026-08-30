package com.example.Panacea.identity.dto;

import com.example.Panacea.identity.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * courseId/sectionId/semesterId are required when role is STUDENT (and ignored
 * otherwise) — a cross-field requirement that can't be expressed with per-field
 * Bean Validation alone, so it's checked in StudentProfileService instead, same
 * as CreateProctorAssignmentRequest's assignmentType-conditional fields.
 *
 * courseId is also reused (sectionId/semesterId stay ignored) when role is HOD:
 * it becomes User.hodCourse, the department the HOD heads. Required-when-HOD is
 * checked in UserService, same cross-field pattern as the STUDENT case above.
 */
public record CreateUserRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String password,
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotNull Role role,
        Long courseId,
        Long sectionId,
        Long semesterId
) {
}
