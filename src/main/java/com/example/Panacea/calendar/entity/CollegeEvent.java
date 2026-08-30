package com.example.Panacea.calendar.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Institution-wide happening (fest, guest lecture, orientation) — same
 * "applies to everyone" shape as Holiday, but kept as its own entity/table
 * rather than a type-discriminated row on Holiday: a fest can carry a
 * timeOfDay and location that a statutory holiday never will, and giving
 * Holiday two always-null columns just to share a table isn't worth it.
 */
@Entity
@Table(name = "college_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollegeEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String title;

    private String description;

    private LocalTime timeOfDay;

    private String location;
}
