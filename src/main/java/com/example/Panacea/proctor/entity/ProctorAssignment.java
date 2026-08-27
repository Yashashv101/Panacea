package com.example.Panacea.proctor.entity;

import com.example.Panacea.identity.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * A staff member's invigilation duty for one exam session. The (staff, session)
 * unique constraint is the DB-level guarantee that a staff member can't be
 * double-assigned to the same session; the per-staff caseload cap is a business
 * rule enforced only in {@code ProctorAssignmentService} — it has no natural
 * uniqueness to back it with a constraint.
 */
@Entity
@Table(name = "proctor_assignments", uniqueConstraints = {
        @UniqueConstraint(name = "uk_proctor_assignment_staff_session",
                columnNames = {"staff_id", "exam_session_reference"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProctorAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @Column(name = "exam_session_reference", nullable = false)
    private String examSessionReference;

    @CreationTimestamp
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt;
}
