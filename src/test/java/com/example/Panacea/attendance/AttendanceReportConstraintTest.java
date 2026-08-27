package com.example.Panacea.attendance;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.attendance.entity.Attendance;
import com.example.Panacea.attendance.entity.AttendanceReport;
import com.example.Panacea.attendance.repository.AttendanceReportRepository;
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

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Validates the database-level guarantee that a student can't have two attendance
 * records for the same session: the composite unique constraint on
 * (attendance_id, student_id) must reject a second AttendanceReport row.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class AttendanceReportConstraintTest extends AbstractPostgresContainerTest {

    @Autowired
    private AttendanceReportRepository attendanceReportRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void rejectsSecondReportForSameEventAndStudent() {
        Course course = persist(Course.builder().name("BSc CS").build());
        Section section = persist(Section.builder().name("A").course(course).build());
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
        Attendance attendance = persist(Attendance.builder()
                .subject(subject)
                .section(section)
                .staff(staff)
                .date(LocalDate.of(2026, 8, 24))
                .period(1)
                .build());

        AttendanceReport first = AttendanceReport.builder()
                .attendance(attendance)
                .student(student)
                .present(true)
                .build();
        attendanceReportRepository.saveAndFlush(first);

        AttendanceReport duplicate = AttendanceReport.builder()
                .attendance(attendance)
                .student(student)
                .present(false)
                .build();

        assertThrows(DataIntegrityViolationException.class,
                () -> attendanceReportRepository.saveAndFlush(duplicate));
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
