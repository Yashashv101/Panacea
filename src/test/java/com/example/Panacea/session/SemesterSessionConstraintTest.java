package com.example.Panacea.session;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.session.entity.Session;
import com.example.Panacea.session.repository.SessionRepository;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.Month;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Validates the Semester -> Session foreign key: a Semester can be persisted
 * with a valid Session, and pointing session_id at a row that doesn't exist
 * is rejected by the database, not silently accepted.
 *
 * Deliberately placed under the `session` package (not `academic`, where the
 * FK actually lives) so it sorts after `attendance` alphabetically: Surefire
 * runs test classes in that order, and AttendancePercentageCachingTest is the
 * one full-context test whose default ddl-auto=update builds the schema the
 * shared Testcontainers Postgres instance needs before any ddl-auto=validate
 * @DataJpaTest class loads. Spring caches ApplicationContext by config
 * signature, and every @DataJpaTest(validate) class here shares the same
 * signature — so if a validate-mode class runs and fails before that schema
 * exists, every other class sharing the signature reuses the cached failure
 * for the rest of the suite, even though nothing is wrong with them
 * individually. Confirmed by moving this test to the `academic` package
 * (sorts before `attendance`) and re-running: all six pre-existing
 * @DataJpaTest classes failed with the shared cached failure. See
 * AbstractPostgresContainerTest for the related static-container note.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=validate")
class SemesterSessionConstraintTest extends AbstractPostgresContainerTest {

    @Autowired
    private SemesterRepository semesterRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void persistsSemesterWithValidSession() {
        Session session = persist(Session.builder()
                .startYear(LocalDate.of(2023, Month.JULY, 1))
                .endYear(LocalDate.of(2024, Month.JUNE, 30))
                .build());

        Semester semester = semesterRepository.saveAndFlush(Semester.builder()
                .number(1)
                .label("Semester 1")
                .session(session)
                .build());

        assertEquals(session.getId(), semester.getSession().getId());
    }

    @Test
    void rejectsSemesterWithNonExistentSession() {
        Session transientSession = Session.builder()
                .id(999_999L)
                .startYear(LocalDate.of(2099, Month.JULY, 1))
                .endYear(LocalDate.of(2100, Month.JUNE, 30))
                .build();

        Semester semester = Semester.builder()
                .number(2)
                .label("Semester 2")
                .session(transientSession)
                .build();

        assertThrows(DataIntegrityViolationException.class,
                () -> semesterRepository.saveAndFlush(semester));
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
