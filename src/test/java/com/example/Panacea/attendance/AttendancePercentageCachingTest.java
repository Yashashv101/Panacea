package com.example.Panacea.attendance;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.attendance.dto.AttendancePercentageResponse;
import com.example.Panacea.attendance.entity.Attendance;
import com.example.Panacea.attendance.entity.AttendanceReport;
import com.example.Panacea.attendance.repository.AttendanceReportRepository;
import com.example.Panacea.attendance.service.AttendanceService;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Proves the read path is actually cached, without mocking the repository: seed
 * one present AttendanceReport, read the percentage once (populating the
 * "attendancePercentage" cache entry), then delete the underlying row directly.
 * A second read within the 5-minute TTL must still return the original (now
 * stale) value — if it recomputed from the database it would see zero sessions
 * instead.
 */
@SpringBootTest
class AttendancePercentageCachingTest extends AbstractPostgresContainerTest {

    @Autowired
    private AttendanceService attendanceService;

    @Autowired
    private AttendanceReportRepository attendanceReportRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void secondReadWithinTtlServesCachedValueInsteadOfRequeryingTheDatabase() {
        Course course = persist(Course.builder().name("BSc CS").build());
        Section section = persist(Section.builder().name("A").course(course).build());
        Semester semester = persist(Semester.builder().number(1).label("Semester 1").build());
        User staff = userRepository.save(User.builder()
                .email("staff-cache@example.com")
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .role(Role.STAFF)
                .build());
        User student = userRepository.save(User.builder()
                .email("student-cache@example.com")
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
        AttendanceReport report = AttendanceReport.builder()
                .attendance(attendance)
                .student(student)
                .present(true)
                .build();
        attendanceReportRepository.saveAndFlush(report);

        AttendancePercentageResponse first = attendanceService.computePercentage(student.getId(), subject.getId());
        assertEquals(1, first.totalSessions());
        assertEquals(100.0, first.percentage());

        attendanceReportRepository.delete(report);
        attendanceReportRepository.flush();

        AttendancePercentageResponse second = attendanceService.computePercentage(student.getId(), subject.getId());
        assertEquals(first, second);
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
