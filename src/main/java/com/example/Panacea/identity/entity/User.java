package com.example.Panacea.identity.entity;

import com.example.Panacea.academic.entity.Course;
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
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    /**
     * Set only when role = HOD — the department (Course) this HOD heads. The
     * unique column constraint enforces at most one active HOD per Course; every
     * non-HOD user leaves this null, and a unique constraint treats multiple
     * NULLs as distinct (same pattern as ProctorAssignment's nullable unique
     * columns), so ADMIN/STAFF/STUDENT rows never collide on it.
     *
     * EAGER (not LAZY) deliberately: UserResponse.from() reads hodCourse.getName()
     * from the controller, outside the service's @Transactional method (same shape
     * as CLAUDE.md's DTO-mapping rule) — LAZY here would throw
     * LazyInitializationException once that transaction's session closes.
     * A single ManyToOne join is cheap, unlike an EAGER collection.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "hod_course_id", unique = true)
    private Course hodCourse;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
