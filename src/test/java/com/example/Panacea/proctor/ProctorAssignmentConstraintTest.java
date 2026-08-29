package com.example.Panacea.proctor;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.proctor.entity.AssignmentType;
import com.example.Panacea.proctor.entity.ProctorAssignment;
import com.example.Panacea.proctor.repository.ProctorAssignmentRepository;
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
 * Validates the database-level guarantee behind proctor assignment: the same
 * staff member can't be assigned twice to the same exam session.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class ProctorAssignmentConstraintTest extends AbstractPostgresContainerTest {

    @Autowired
    private ProctorAssignmentRepository proctorAssignmentRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void rejectsSecondAssignmentForSameStaffAndSession() {
        User staff = persist(User.builder()
                .email("staff@example.com")
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .role(Role.STAFF)
                .build());

        ProctorAssignment first = ProctorAssignment.builder()
                .assignmentType(AssignmentType.EXAM)
                .staff(staff)
                .examSessionReference("EXAM-2026-SEM1-CS101")
                .build();
        proctorAssignmentRepository.saveAndFlush(first);

        ProctorAssignment duplicate = ProctorAssignment.builder()
                .assignmentType(AssignmentType.EXAM)
                .staff(staff)
                .examSessionReference("EXAM-2026-SEM1-CS101")
                .build();

        assertThrows(DataIntegrityViolationException.class,
                () -> proctorAssignmentRepository.saveAndFlush(duplicate));
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
