package com.example.Panacea.enrollment.entity;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.identity.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * {@code mentor} is resolved via ProctorAssignmentService#findMentorForStudent at
 * request-creation time and stored as a snapshot — it stays null forever if no
 * mentor was assigned yet, rather than being re-resolved later. That's also what
 * the mentor's pending-requests queue filters on, so a request created before its
 * student had a mentor never surfaces in anyone's queue even after one is assigned
 * (see ElectiveEnrollmentService for the admin-visible "unassigned" queue this
 * implies). Approve/reject, by contrast, re-resolves the mentor live at decision
 * time rather than trusting this snapshot, matching the ownership-guard pattern
 * used elsewhere (e.g. ResultService#requireSubjectOwnership) — the snapshot can
 * go stale if the student's mentor changes after the request was filed.
 */
@Entity
@Table(name = "elective_enrollment_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElectiveEnrollmentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EnrollmentStatus status = EnrollmentStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mentor_id")
    private User mentor;

    @Column(name = "decided_at")
    private Instant decidedAt;
}
