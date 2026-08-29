package com.example.Panacea.risk.entity;

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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A point-in-time copy of a student's computed risk, so trends over time can be shown
 * without recomputing against historical data (which the schema doesn't retain a
 * timeline for — see {@code RiskScoringService} for the "no real dropout outcome"
 * caveat this whole feature already carries).
 */
@Entity
@Table(name = "risk_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "computed_at", nullable = false)
    private Instant computedAt;

    @Column(name = "attendance_percentage", nullable = false)
    private Double attendancePercentage;

    @Column(name = "average_marks_percentage", nullable = false)
    private Double averageMarksPercentage;

    @Column(name = "marks_trend", nullable = false)
    private Double marksTrend;

    @Column(name = "risk_probability", nullable = false)
    private Double riskProbability;

    @Column(name = "risk_level", nullable = false, length = 10)
    private String riskLevel;
}
