package com.example.Panacea.results;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.results.entity.StudentResult;
import com.example.Panacea.results.repository.StudentResultRepository;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Validates the database-level guarantee behind result entry: a student can have
 * only one StudentResult row per (student, subject, semester) combination.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class StudentResultConstraintTest extends AbstractPostgresContainerTest {

    @Autowired
    private StudentResultRepository studentResultRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void rejectsSecondResultForSameStudentSubjectAndSemester() {
        Semester semester = persist(Semester.builder().number(1).label("Semester 1").build());
        User staff = persist(User.builder()
                .email("staff@example.com")
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .role(Role.STAFF)
                .build());
        User student = persist(User.builder()
                .email("student@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());
        Subject subject = persist(Subject.builder()
                .name("Maths")
                .credits(3)
                .primaryStaff(staff)
                .semester(semester)
                .build());

        StudentResult first = StudentResult.builder()
                .student(student)
                .subject(subject)
                .semester(semester)
                .test1(18.0)
                .test2(17.0)
                .quiz(9.0)
                .experiential(10.0)
                .see(45.0)
                .build();
        studentResultRepository.saveAndFlush(first);

        StudentResult duplicate = StudentResult.builder()
                .student(student)
                .subject(subject)
                .semester(semester)
                .test1(10.0)
                .test2(10.0)
                .quiz(5.0)
                .experiential(5.0)
                .see(30.0)
                .build();

        assertThrows(DataIntegrityViolationException.class,
                () -> studentResultRepository.saveAndFlush(duplicate));
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
