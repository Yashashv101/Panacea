package com.example.Panacea.academic.entity;

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
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "subjects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer credits;

    // Defaults existing rows to CORE via @ColumnDefault (not columnDefinition,
    // for the same reason as ProctorAssignment.assignmentType — see its comment)
    // so ddl-auto=update can add this NOT NULL column onto an already-populated
    // subjects table without a migration tool.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @ColumnDefault("'CORE'")
    @Builder.Default
    private SubjectType type = SubjectType.CORE;

    // EAGER (not LAZY) for the same reason as User.hodCourse: SubjectResponse.from()
    // reads primaryStaff.getFirstName()/getLastName(), and while every current call
    // site happens to map inside a @Transactional method, EAGER removes the
    // dependency on that always being true going forward. A single ManyToOne join
    // is cheap; confirmed no query here relies on LAZY to skip the join
    // (SubjectRepository has no @EntityGraph/fetch-avoidance, and no test asserts
    // proxy/uninitialized state on this field).
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "primary_staff_id")
    private User primaryStaff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "subject_courses",
            joinColumns = @JoinColumn(name = "subject_id"),
            inverseJoinColumns = @JoinColumn(name = "course_id"))
    @Builder.Default
    private Set<Course> courses = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "subject_sections",
            joinColumns = @JoinColumn(name = "subject_id"),
            inverseJoinColumns = @JoinColumn(name = "section_id"))
    @Builder.Default
    private Set<Section> sections = new HashSet<>();
}
