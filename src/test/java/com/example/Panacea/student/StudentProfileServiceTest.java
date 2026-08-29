package com.example.Panacea.student;

import com.example.Panacea.academic.dto.SubjectResponse;
import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.entity.SubjectType;
import com.example.Panacea.identity.dto.UserResponse;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.student.entity.StudentProfile;
import com.example.Panacea.student.service.StudentProfileService;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Covers the two roster/derivation fixes this session: a section's roster
 * includes only students actually profiled into it (not students in other
 * sections, not STUDENT users with no profile row at all — confirmed as the
 * natural behavior, no special-casing needed for either), and core-subject
 * derivation returns exactly the CORE subjects tied to a student's own
 * course + semester — not electives, not another course's subjects, not
 * another semester's subjects, and — the point this test exists to nail
 * down — NOT gated by section at all: a core subject taught to a different
 * section of the same course, in the same semester, still counts, since
 * core/elective is a property of (course, semester), not of section.
 */
@SpringBootTest
class StudentProfileServiceTest extends AbstractPostgresContainerTest {

    @Autowired
    private StudentProfileService studentProfileService;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void coreSubjectDerivationIsKeyedByCourseAndSemesterNotSection() {
        Course course = persist(Course.builder().name("BSc CS").build());
        Course otherCourse = persist(Course.builder().name("BE CS").build());
        Section sectionX = persist(Section.builder().name("X").course(course).build());
        Section sectionY = persist(Section.builder().name("Y").course(course).build());
        Semester semester = persist(Semester.builder().number(1).label("Semester 1").build());
        Semester otherSemester = persist(Semester.builder().number(2).label("Semester 2").build());

        // Taught to Section Y only — must still count for a student in Section X,
        // since it's the same course + semester and section plays no role here.
        Subject coreForOtherSection = persist(Subject.builder()
                .name("Data Structures").credits(4).type(SubjectType.CORE)
                .semester(semester).courses(Set.of(course)).sections(Set.of(sectionY)).build());
        persist(Subject.builder()
                .name("Robotics (elective)").credits(3).type(SubjectType.ELECTIVE)
                .semester(semester).courses(Set.of(course)).sections(Set.of(sectionX)).build());
        persist(Subject.builder()
                .name("Core subject, wrong semester").credits(4).type(SubjectType.CORE)
                .semester(otherSemester).courses(Set.of(course)).sections(Set.of(sectionX)).build());
        persist(Subject.builder()
                .name("Core subject, wrong course").credits(4).type(SubjectType.CORE)
                .semester(semester).courses(Set.of(otherCourse)).sections(Set.of(sectionX)).build());

        User student = persistStudent("student-corederiv@example.com");
        persist(StudentProfile.builder().user(student).course(course).section(sectionX).semester(semester).build());

        List<SubjectResponse> coreSubjects = studentProfileService.findCoreSubjects(student.getId());

        assertEquals(1, coreSubjects.size());
        assertEquals(coreForOtherSection.getId(), coreSubjects.get(0).id());
    }

    @Test
    @Transactional
    void sectionRosterIncludesOnlyStudentsProfiledIntoThatSection() {
        Course course = persist(Course.builder().name("BSc CS").build());
        Section sectionX = persist(Section.builder().name("X").course(course).build());
        Section sectionY = persist(Section.builder().name("Y").course(course).build());
        Semester semester = persist(Semester.builder().number(1).label("Semester 1").build());

        User studentInX = persistStudent("student-roster-x@example.com");
        persist(StudentProfile.builder().user(studentInX).course(course).section(sectionX).semester(semester).build());

        User studentInY = persistStudent("student-roster-y@example.com");
        persist(StudentProfile.builder().user(studentInY).course(course).section(sectionY).semester(semester).build());

        User studentWithNoProfile = persistStudent("student-roster-noprofile@example.com");

        List<UserResponse> roster = studentProfileService.findStudentsInSection(sectionX.getId());

        assertEquals(1, roster.size());
        assertEquals(studentInX.getId(), roster.get(0).id());
        assertTrue(roster.stream().noneMatch(u -> u.id().equals(studentInY.getId())),
                "student in a different section must not appear in this section's roster");
        assertTrue(roster.stream().noneMatch(u -> u.id().equals(studentWithNoProfile.getId())),
                "a STUDENT with no profile row must not appear in any section's roster");
    }

    private User persistStudent(String email) {
        return persist(User.builder()
                .email(email)
                .passwordHash("hash")
                .firstName("Test")
                .lastName("Student")
                .role(Role.STUDENT)
                .build());
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
