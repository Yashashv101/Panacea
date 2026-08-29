package com.example.Panacea.mcq;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.mcq.dto.CreateQuizRequest;
import com.example.Panacea.mcq.dto.QuizAttemptResponse;
import com.example.Panacea.mcq.dto.QuizResponse;
import com.example.Panacea.mcq.dto.SubmitQuizAttemptRequest;
import com.example.Panacea.mcq.service.QuizService;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Covers the marks-based grading rewrite: score is the sum of marks for correctly
 * answered questions out of the sum of all questions' marks, not a naive correct
 * count, and rescaleToTen converts that raw ratio onto a /10 scale.
 */
@SpringBootTest
class QuizServiceGradingTest extends AbstractPostgresContainerTest {

    @Autowired
    private QuizService quizService;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void gradesUsingSumOfMarksNotNaiveCorrectCount() {
        User staff = persistUser("grading-staff@example.com", Role.STAFF);
        User student = persistUser("grading-student@example.com", Role.STUDENT);
        Subject subject = persistSubject("Chemistry", staff);

        // Marks 1, 2, 5 — a naive correct-count would score 2/3; the correct
        // marks-weighted score for getting the 2 higher-value questions right is 7/8.
        QuizResponse quiz = quizService.createQuiz(new CreateQuizRequest(
                "Marks Quiz", subject.getId(), false, List.of(
                        new CreateQuizRequest.QuestionRequest("Q1", List.of("a", "b"), 0, 1),
                        new CreateQuizRequest.QuestionRequest("Q2", List.of("a", "b"), 0, 2),
                        new CreateQuizRequest.QuestionRequest("Q3", List.of("a", "b"), 0, 5)
                )), staff.getId());

        Long q1 = quiz.questions().get(0).id();
        Long q2 = quiz.questions().get(1).id();
        Long q3 = quiz.questions().get(2).id();

        // Wrong on Q1 (marks 1), correct on Q2 and Q3 (marks 2 + 5 = 7).
        QuizAttemptResponse attempt = quizService.attempt(quiz.id(),
                new SubmitQuizAttemptRequest(Map.of(q1, 1, q2, 0, q3, 0)), student.getId());

        assertEquals(7, attempt.rawScore());
        assertEquals(8, attempt.totalPossibleMarks());
        assertNull(attempt.rescaledScore());
    }

    @Test
    @Transactional
    void rescaleToTenConvertsNonTenRawTotalToTenScale() {
        User staff = persistUser("rescale-staff@example.com", Role.STAFF);
        User student = persistUser("rescale-student@example.com", Role.STUDENT);
        Subject subject = persistSubject("Physics", staff);

        // Total possible marks = 18; answering correctly for 12 of them.
        QuizResponse quiz = quizService.createQuiz(new CreateQuizRequest(
                "Rescaled Quiz", subject.getId(), true, List.of(
                        new CreateQuizRequest.QuestionRequest("Q1", List.of("a", "b"), 0, 6),
                        new CreateQuizRequest.QuestionRequest("Q2", List.of("a", "b"), 0, 6),
                        new CreateQuizRequest.QuestionRequest("Q3", List.of("a", "b"), 0, 6)
                )), staff.getId());

        Long q1 = quiz.questions().get(0).id();
        Long q2 = quiz.questions().get(1).id();
        Long q3 = quiz.questions().get(2).id();

        // Correct on Q1 and Q2 (6 + 6 = 12 out of 18), wrong on Q3.
        QuizAttemptResponse attempt = quizService.attempt(quiz.id(),
                new SubmitQuizAttemptRequest(Map.of(q1, 0, q2, 0, q3, 1)), student.getId());

        assertEquals(12, attempt.rawScore());
        assertEquals(18, attempt.totalPossibleMarks());
        assertEquals(12.0 / 18.0 * 10.0, attempt.rescaledScore(), 1e-9);
    }

    private User persistUser(String email, Role role) {
        return persist(User.builder()
                .email(email)
                .passwordHash("hash")
                .firstName("Test")
                .lastName("User")
                .role(role)
                .build());
    }

    private Subject persistSubject(String name, User staff) {
        Semester semester = persist(Semester.builder().number(1).label("Semester 1").build());
        return persist(Subject.builder()
                .name(name)
                .credits(3)
                .primaryStaff(staff)
                .semester(semester)
                .build());
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
