package com.example.Panacea.results.entity;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
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

/**
 * The 5 grading components are stored as separate columns; the total is never
 * persisted (see {@code results.dto.StudentResultResponse#from}) so a change to the
 * grading weights never requires a migration or backfill.
 */
@Entity
@Table(name = "student_results", uniqueConstraints = {
        @UniqueConstraint(name = "uk_student_result_student_subject_semester",
                columnNames = {"student_id", "subject_id", "semester_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentResult {

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

    @Column(nullable = false)
    private Double test1;

    @Column(nullable = false)
    private Double test2;

    @Column(nullable = false)
    private Double quiz;

    @Column(nullable = false)
    private Double experiential;

    @Column(nullable = false)
    private Double see;
}
