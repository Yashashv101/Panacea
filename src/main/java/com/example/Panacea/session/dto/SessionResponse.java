package com.example.Panacea.session.dto;

import com.example.Panacea.session.entity.Session;

import java.time.LocalDate;

public record SessionResponse(Long id, LocalDate startYear, LocalDate endYear, String label) {
    public static SessionResponse from(Session session) {
        return new SessionResponse(
                session.getId(),
                session.getStartYear(),
                session.getEndYear(),
                session.getStartYear().getYear() + "-" + session.getEndYear().getYear());
    }
}
