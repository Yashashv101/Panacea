package com.example.Panacea.proctor;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.proctor.dto.CreateProctorAssignmentRequest;
import com.example.Panacea.proctor.entity.AssignmentType;
import com.example.Panacea.proctor.entity.ProctorAssignment;
import com.example.Panacea.proctor.repository.ProctorAssignmentRepository;
import com.example.Panacea.proctor.service.ProctorAssignmentService;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the business rules that sit on top of ProctorAssignment's DB
 * constraints: a student can only have one active MENTOR row, and a staff
 * member's EXAM and MENTOR caseloads are capped at 25 independently of each
 * other (see the proctor/ note in CLAUDE.md).
 */
@SpringBootTest
class ProctorAssignmentServiceTest extends AbstractPostgresContainerTest {

    @Autowired
    private ProctorAssignmentService proctorAssignmentService;

    @Autowired
    private ProctorAssignmentRepository proctorAssignmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @Transactional
    void rejectsSecondMentorForAStudentWhoAlreadyHasOne() {
        User staff = persistStaff("mentor-staff-1@example.com");
        User staff2 = persistStaff("mentor-staff-2@example.com");
        User student = persistStudent("mentor-student-1@example.com");

        proctorAssignmentService.assign(
                new CreateProctorAssignmentRequest(staff.getId(), AssignmentType.MENTOR, null, student.getId()));

        assertThrows(IllegalStateException.class, () -> proctorAssignmentService.assign(
                new CreateProctorAssignmentRequest(staff2.getId(), AssignmentType.MENTOR, null, student.getId())));
    }

    @Test
    @Transactional
    void rejects26thMenteeForAStaffAtCapIndependentlyOfExamCaseload() {
        User staff = persistStaff("mentee-cap-staff@example.com");

        // A handful of EXAM assignments for the same staff should have no bearing
        // on their separately-tracked MENTOR caseload cap.
        for (int i = 0; i < 5; i++) {
            proctorAssignmentRepository.saveAndFlush(ProctorAssignment.builder()
                    .assignmentType(AssignmentType.EXAM)
                    .staff(staff)
                    .examSessionReference("EXAM-CAP-TEST-" + i)
                    .build());
        }

        for (int i = 0; i < 25; i++) {
            User student = persistStudent("mentee-cap-student-" + i + "@example.com");
            proctorAssignmentService.assign(
                    new CreateProctorAssignmentRequest(staff.getId(), AssignmentType.MENTOR, null, student.getId()));
        }

        User overflowStudent = persistStudent("mentee-cap-student-overflow@example.com");
        assertThrows(IllegalStateException.class, () -> proctorAssignmentService.assign(
                new CreateProctorAssignmentRequest(
                        staff.getId(), AssignmentType.MENTOR, null, overflowStudent.getId())));
    }

    @Test
    @Transactional
    void findMentorForStudentReturnsEmptyWhenNoneAssigned() {
        User student = persistStudent("mentor-lookup-student@example.com");

        assertTrue(proctorAssignmentService.findMentorForStudent(student.getId()).isEmpty());
    }

    private User persistStaff(String email) {
        return userRepository.save(User.builder()
                .email(email)
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .role(Role.STAFF)
                .build());
    }

    private User persistStudent(String email) {
        return userRepository.save(User.builder()
                .email(email)
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());
    }
}
