package com.example.Panacea.student.entity;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.identity.entity.User;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * The enrollment record PROJECT_KNOWLEDGE.md's {@code Student} model (admin ->
 * OneToOne CustomUser; course -> FK; session -> FK; section -> FK nullable;
 * semester -> FK nullable) covered, deliberately not reproduced 1:1: no
 * {@code session} field, since this rewrite already made Semester -> Session
 * an FK (see academic.entity.Semester) — a direct session FK here would just
 * duplicate what semester.getSession() already gives, reintroducing the
 * parallel-not-hierarchical shape that FK was added to get away from.
 * <p>
 * course/section/semester are NOT NULL here, unlike Django's nullable
 * section/semester — the entire reason this entity exists is to make a
 * student's semester a server-known fact instead of a caller-supplied
 * parameter three services were silently trusting, so a half-populated
 * profile would just reintroduce that gap in a new shape. A STUDENT user
 * with no profile row is a valid, distinct state (not yet set up by an
 * admin) — represented by the absence of a row, not nulls in one.
 * <p>
 * Only ever created for {@code Role.STUDENT} users — enforced in
 * StudentProfileService, not a DB constraint (a check across the users
 * table's role column isn't expressible as a simple column constraint here).
 */
@Entity
@Table(name = "student_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private Section section;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;
}
