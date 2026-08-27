package com.example.Panacea.identity.dto;

import com.example.Panacea.identity.entity.Role;

public record LoginResponse(
        String token,
        String tokenType,
        long expiresInMillis,
        String email,
        Role role
) {
}
