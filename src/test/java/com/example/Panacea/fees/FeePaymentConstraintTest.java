package com.example.Panacea.fees;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.fees.entity.FeePayment;
import com.example.Panacea.fees.repository.FeePaymentRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Validates the database-level guarantee behind payment idempotency: two
 * FeePayment rows can never share the same idempotency key.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class FeePaymentConstraintTest extends AbstractPostgresContainerTest {

    @Autowired
    private FeePaymentRepository feePaymentRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void rejectsSecondPaymentWithSameIdempotencyKey() {
        Course course = persist(Course.builder().name("BSc CS").build());
        Semester semester = persist(Semester.builder().number(1).label("Semester 1").build());
        User student = persist(User.builder()
                .email("student@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());

        FeePayment first = FeePayment.builder()
                .student(student)
                .course(course)
                .semester(semester)
                .amount(BigDecimal.valueOf(1000))
                .idempotencyKey("shared-key")
                .build();
        feePaymentRepository.saveAndFlush(first);

        FeePayment duplicate = FeePayment.builder()
                .student(student)
                .course(course)
                .semester(semester)
                .amount(BigDecimal.valueOf(1000))
                .idempotencyKey("shared-key")
                .build();

        assertThrows(DataIntegrityViolationException.class,
                () -> feePaymentRepository.saveAndFlush(duplicate));
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
