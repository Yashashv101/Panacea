package com.example.Panacea.academic.dto;

import com.example.Panacea.academic.entity.Course;

public record CourseResponse(Long id, String name) {
    public static CourseResponse from(Course course) {
        return new CourseResponse(course.getId(), course.getName());
    }
}
