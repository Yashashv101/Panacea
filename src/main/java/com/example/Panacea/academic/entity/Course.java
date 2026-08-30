package com.example.Panacea.academic.entity;

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

@Entity
@Table(name = "courses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    /**
     * columnDefinition sets a DB-level default: ddl-auto=update issues a plain
     * ALTER TABLE ADD COLUMN for this new column against the existing (already
     * populated) courses table, and without a default that fails immediately
     * with "column active of relation courses contains null values" the moment
     * any row already exists — which, in any environment with real data, is
     * always.
     */
    @Column(nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private boolean active = true;
}
