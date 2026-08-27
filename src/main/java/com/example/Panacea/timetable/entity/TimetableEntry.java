package com.example.Panacea.timetable.entity;

import com.example.Panacea.academic.entity.Section;
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
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;

/**
 * Three composite unique constraints enforce the "no double-booking" guarantee at the
 * database level: a staff member, and a section, can each occupy only one slot per
 * (day, period). Room is not yet modeled in this phase, so no room-slot constraint exists.
 */
@Entity
@Table(name = "timetable_entries", uniqueConstraints = {
        @UniqueConstraint(name = "uk_timetable_staff_slot", columnNames = {"staff_id", "day_of_week", "period"}),
        @UniqueConstraint(name = "uk_timetable_section_slot", columnNames = {"section_id", "day_of_week", "period"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimetableEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false, length = 10)
    private DayOfWeek day;

    @Column(nullable = false)
    private Integer period;
}
