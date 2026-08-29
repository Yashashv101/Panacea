package com.example.Panacea.proctor.entity;

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
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * A staff member's duty, of one of two kinds identified by {@code assignmentType}:
 * an EXAM row is invigilation duty for one exam session ({@code examSessionReference}
 * set, {@code student} null); a MENTOR row is a standing mentor assignment for one
 * student ({@code student} set, {@code examSessionReference} null). The two kinds
 * share this table and the 25-per-staff caseload cap mechanism, but the cap is
 * counted separately per {@code assignmentType} in {@code ProctorAssignmentService}.
 * <p>
 * The (staff, session) unique constraint only ever collides among EXAM rows, since
 * MENTOR rows always carry a null {@code examSessionReference} and Postgres treats
 * NULLs as distinct for uniqueness purposes. Likewise the unique constraint on
 * {@code student_id} only ever collides among MENTOR rows (EXAM rows carry a null
 * student), giving "one active mentor per student" without needing a partial index.
 * The per-staff caseload cap itself remains a business rule enforced only in
 * {@code ProctorAssignmentService} — it has no natural uniqueness to back it with
 * a constraint.
 */
@Entity
@Table(name = "proctor_assignments", uniqueConstraints = {
        @UniqueConstraint(name = "uk_proctor_assignment_staff_session",
                columnNames = {"staff_id", "exam_session_reference"}),
        @UniqueConstraint(name = "uk_proctor_assignment_student_mentor",
                columnNames = {"student_id"})
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

    // The default is declared via @ColumnDefault, not columnDefinition: Hibernate's
    // ddl-auto=update schema comparison treats a default folded into columnDefinition
    // as part of the column's type declaration, so a later mismatch triggers a
    // single generated "ALTER COLUMN assignment_type SET DATA TYPE varchar(20)
    // default 'EXAM'" statement, which Postgres rejects (type change and default
    // change are separate ALTER COLUMN clauses). @ColumnDefault keeps Hibernate's
    // default-value comparison on its own path, so a mismatch instead emits a
    // standalone "ALTER COLUMN assignment_type SET DEFAULT 'EXAM'". The default
    // itself dates back to adding this NOT NULL column against 28 pre-existing
    // (all EXAM) rows, and is already applied at the DB level from that migration.
    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_type", nullable = false, length = 20)
    @ColumnDefault("'EXAM'")
    private AssignmentType assignmentType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @Column(name = "exam_session_reference")
    private String examSessionReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private User student;

    @CreationTimestamp
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt;
}
