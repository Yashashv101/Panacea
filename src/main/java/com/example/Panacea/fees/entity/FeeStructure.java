package com.example.Panacea.fees.entity;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Semester;
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

import java.math.BigDecimal;

/**
 * The canonical fee amount for a (course, semester) pair. {@code FeePaymentService}
 * always recomputes the amount from this table server-side — a client-supplied
 * amount on the initiate request is never trusted.
 */
@Entity
@Table(name = "fee_structures", uniqueConstraints = {
        @UniqueConstraint(name = "uk_fee_structure_course_semester", columnNames = {"course_id", "semester_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeStructure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;
}
