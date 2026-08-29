package com.example.Panacea.results;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.audit.entity.AuditLog;
import com.example.Panacea.audit.repository.AuditLogRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.results.dto.StudentResultResponse;
import com.example.Panacea.results.dto.UpsertResultRequest;
import com.example.Panacea.results.service.ResultService;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Confirms upserting a StudentResult writes an AuditLog row (Phase 6 audit trail
 * requirement) with the actor, action and entity identity that let an admin trace
 * who changed a grade and when.
 */
@SpringBootTest
class ResultUpsertAuditLogTest extends AbstractPostgresContainerTest {

    @Autowired
    private ResultService resultService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void upsertingAResultWritesAnAuditLogRow() {
        User staff = userRepository.save(User.builder()
                .email("staff-audit@example.com")
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .role(Role.STAFF)
                .build());
        User student = userRepository.save(User.builder()
                .email("student-audit@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());
        Semester semester = persist(Semester.builder().number(1).label("Semester 1").build());
        Subject subject = persist(Subject.builder()
                .name("Physics")
                .credits(3)
                .primaryStaff(staff)
                .semester(semester)
                .build());

        UpsertResultRequest request = new UpsertResultRequest(
                student.getId(), subject.getId(), semester.getId(), 8.0, 9.0, 4.5, 45.0);

        StudentResultResponse response = resultService.upsertResult(request, staff.getId());

        List<AuditLog> logs = auditLogRepository.findAll();
        assertEquals(1, logs.size());
        AuditLog log = logs.get(0);
        assertEquals(staff.getId(), log.getActor().getId());
        assertEquals("RESULT_UPSERT", log.getAction());
        assertEquals("StudentResult", log.getEntityType());
        assertEquals(response.id(), log.getEntityId());
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
