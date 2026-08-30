package com.example.Panacea.academic.entity;

import com.example.Panacea.session.entity.Session;
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

@Entity
@Table(name = "semesters", uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Semester {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique per (session, number) below, not globally: every Session needs its
    // own Semester 1..N (a college runs all N semesters concurrently every
    // academic year, one per cohort-year), so the same number recurs across
    // Sessions by design — see SessionService's auto-create-per-Session policy.
    @Column(nullable = false)
    private Integer number;

    @Column(nullable = false)
    private String label;

    // Nullable at the DB level so ddl-auto=update can add this column onto an
    // existing populated `semesters` table without a data migration tool.
    // SessionBootstrap backfills any pre-existing null rows to a seeded
    // "current" Session at startup; new Semesters are required to supply one
    // (enforced in SemesterRequest/SemesterService, not the DB constraint).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private Session session;

    // Derived from `number` (odd numbers are ODD, even numbers are EVEN) —
    // never independently settable. Persisted (not computed at read time) so
    // it can be queried/filtered directly. @ColumnDefault (not columnDefinition)
    // for the same ddl-auto=update-on-populated-table reason as Subject.type.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @ColumnDefault("'ODD'")
    @Builder.Default
    private SemesterParity parity = SemesterParity.ODD;
}
