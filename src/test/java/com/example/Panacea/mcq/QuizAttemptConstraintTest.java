package com.example.Panacea.mcq;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.mcq.entity.Quiz;
import com.example.Panacea.mcq.entity.QuizAttempt;
import com.example.Panacea.mcq.repository.QuizAttemptRepository;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Validates the database-level guarantee behind quiz submission: a student can
 * have only one QuizAttempt row per (quiz, student) combination.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class QuizAttemptConstraintTest extends AbstractPostgresContainerTest {

    @Autowired
    private QuizAttemptRepository quizAttemptRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void rejectsSecondAttemptForSameQuizAndStudent() {
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
        Quiz quiz = persist(Quiz.builder().title("Quiz 1").subject(subject).staff(staff).build());

        QuizAttempt first = QuizAttempt.builder()
                .quiz(quiz)
                .student(student)
                .answers(Map.of())
                .score(0)
                .build();
        quizAttemptRepository.saveAndFlush(first);

        QuizAttempt duplicate = QuizAttempt.builder()
                .quiz(quiz)
                .student(student)
                .answers(Map.of())
                .score(0)
                .build();

        assertThrows(DataIntegrityViolationException.class,
                () -> quizAttemptRepository.saveAndFlush(duplicate));
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
