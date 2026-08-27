package com.example.Panacea.identity.dto;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;

public record UserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        Role role,
        boolean enabled
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole(),
                user.isEnabled());
    }
}
