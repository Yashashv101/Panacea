package com.example.Panacea.attendance.dto;

import com.example.Panacea.attendance.entity.Attendance;

import java.time.LocalDate;

public record AttendanceResponse(
        Long id,
        Long subjectId,
        String subjectName,
        Long sectionId,
        String sectionName,
        Long staffId,
        LocalDate date,
        Integer period,
        int studentsRecorded
) {
    public static AttendanceResponse from(Attendance attendance, int studentsRecorded) {
        return new AttendanceResponse(
                attendance.getId(),
                attendance.getSubject().getId(),
                attendance.getSubject().getName(),
                attendance.getSection().getId(),
                attendance.getSection().getName(),
                attendance.getStaff().getId(),
                attendance.getDate(),
                attendance.getPeriod(),
                studentsRecorded);
    }
}
