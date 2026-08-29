package com.example.Panacea.enrollment;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.entity.SubjectType;
import com.example.Panacea.enrollment.dto.ElectiveEnrollmentResponse;
import com.example.Panacea.enrollment.dto.SubmitElectiveEnrollmentRequest;
import com.example.Panacea.enrollment.service.ElectiveEnrollmentService;
import com.example.Panacea.fees.entity.FeePayment;
import com.example.Panacea.fees.entity.PaymentStatus;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.proctor.dto.CreateProctorAssignmentRequest;
import com.example.Panacea.proctor.entity.AssignmentType;
import com.example.Panacea.proctor.service.ProctorAssignmentService;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Covers the four behaviors called out for this module: fee-gated creation,
 * mentor-ownership-guarded decisions, single-decision enforcement, and that a
 * request with no mentor assigned yet is still allowed to be created.
 */
@SpringBootTest
class ElectiveEnrollmentServiceTest extends AbstractPostgresContainerTest {

    @Autowired
    private ElectiveEnrollmentService electiveEnrollmentService;

    @Autowired
    private ProctorAssignmentService proctorAssignmentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void rejectsRequestWhenFeesNotPaid() {
        User student = persistUser("student-unpaid@example.com", Role.STUDENT);
        Subject electiveSubject = persistElectiveSubject("Robotics");

        SubmitElectiveEnrollmentRequest request = new SubmitElectiveEnrollmentRequest(electiveSubject.getId());

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> electiveEnrollmentService.submit(request, student.getId()));
        assertEquals("Fees for semester " + electiveSubject.getSemester().getId()
                + " must be paid before requesting an elective", exception.getMessage());
    }

    @Test
    @Transactional
    void rejectsApprovalByNonMentorStaffMember() {
        User student = persistUser("student-wrongmentor@example.com", Role.STUDENT);
        User assignedMentor = persistUser("mentor-assigned@example.com", Role.STAFF);
        User otherStaff = persistUser("staff-notmentor@example.com", Role.STAFF);
        Subject electiveSubject = persistElectiveSubject("Cryptography");
        payFees(student, electiveSubject.getSemester(), "session-wrongmentor");

        proctorAssignmentService.assign(
                new CreateProctorAssignmentRequest(assignedMentor.getId(), AssignmentType.MENTOR, null, student.getId()));

        ElectiveEnrollmentResponse response = electiveEnrollmentService.submit(
                new SubmitElectiveEnrollmentRequest(electiveSubject.getId()), student.getId());
        assertEquals(assignedMentor.getId(), response.mentorId());

        assertThrows(AccessDeniedException.class,
                () -> electiveEnrollmentService.approve(response.id(), otherStaff.getId()));
    }

    @Test
    @Transactional
    void rejectsSecondDecisionOnAlreadyDecidedRequest() {
        User student = persistUser("student-redecide@example.com", Role.STUDENT);
        User mentor = persistUser("mentor-redecide@example.com", Role.STAFF);
        Subject electiveSubject = persistElectiveSubject("Game Theory");
        payFees(student, electiveSubject.getSemester(), "session-redecide");

        proctorAssignmentService.assign(
                new CreateProctorAssignmentRequest(mentor.getId(), AssignmentType.MENTOR, null, student.getId()));

        ElectiveEnrollmentResponse response = electiveEnrollmentService.submit(
                new SubmitElectiveEnrollmentRequest(electiveSubject.getId()), student.getId());

        electiveEnrollmentService.approve(response.id(), mentor.getId());

        assertThrows(IllegalStateException.class,
                () -> electiveEnrollmentService.reject(response.id(), mentor.getId()));
    }

    @Test
    @Transactional
    void mentorlessRequestDoesNotErrorOnCreation() {
        User student = persistUser("student-nomentor@example.com", Role.STUDENT);
        Subject electiveSubject = persistElectiveSubject("Astrophysics");
        payFees(student, electiveSubject.getSemester(), "session-nomentor");

        ElectiveEnrollmentResponse response = electiveEnrollmentService.submit(
                new SubmitElectiveEnrollmentRequest(electiveSubject.getId()), student.getId());

        assertNull(response.mentorId());
    }

    private User persistUser(String email, Role role) {
        return userRepository.save(User.builder()
                .email(email)
                .passwordHash("hash")
                .firstName("Test")
                .lastName("User")
                .role(role)
                .build());
    }

    private Subject persistElectiveSubject(String name) {
        Semester semester = persist(Semester.builder().number(1).label("Semester 1").build());
        return persist(Subject.builder()
                .name(name)
                .credits(3)
                .type(SubjectType.ELECTIVE)
                .semester(semester)
                .build());
    }

    private void payFees(User student, Semester semester, String idempotencyKey) {
        Course course = persist(Course.builder().name("Course-" + idempotencyKey).build());
        persist(FeePayment.builder()
                .student(student)
                .course(course)
                .semester(semester)
                .amount(BigDecimal.valueOf(1000))
                .status(PaymentStatus.PAID)
                .idempotencyKey(idempotencyKey)
                .build());
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
