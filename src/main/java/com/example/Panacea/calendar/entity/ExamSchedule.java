package com.example.Panacea.calendar.entity;

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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Tied to Semester only, not a separate Session field: Semester already
 * carries a required Session FK (see Semester.session), so a second,
 * independently-settable sessionId here would just be a second source of
 * truth that could disagree with the Semester's own session. Callers that
 * need the session read it via semester.getSession().
 *
 * course is nullable: most exams are semester-wide (all departments sit the
 * same paper on the same date), but Subject is many-to-many with Course, so
 * a department can realistically want its own exam date for a shared
 * subject — a non-null course scopes this row to just that department,
 * leaving the semester-wide default for everyone else.
 */
@Entity
@Table(name = "exam_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate startDate;

    // Null means a single-day exam (startDate only); set for a multi-day window.
    private LocalDate endDate;

    @Column(nullable = false)
    private String name;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;
}
