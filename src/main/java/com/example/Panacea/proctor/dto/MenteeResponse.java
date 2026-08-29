package com.example.Panacea.proctor.dto;

import com.example.Panacea.academic.dto.SubjectResponse;
import com.example.Panacea.fees.entity.PaymentStatus;

import java.util.List;

/**
 * A mentee's roster row for the staff "My Mentees" view: their course/section
 * placement, their most recent fee payment status for their current semester
 * (null — not a {@code PaymentStatus} value — means no payment record exists
 * at all, distinct from PENDING/FAILED), and the subjects they're actually
 * enrolled in (core + approved electives, same list StudentProfileService's
 * findMySubjects gives the student themselves).
 */
public record MenteeResponse(
        Long studentId,
        String studentName,
        String email,
        Long courseId,
        String courseName,
        Long sectionId,
        String sectionName,
        PaymentStatus feeStatus,
        List<SubjectResponse> subjects
) {
}
