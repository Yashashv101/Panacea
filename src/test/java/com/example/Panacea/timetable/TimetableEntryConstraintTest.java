package com.example.Panacea.timetable;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.timetable.entity.TimetableEntry;
import com.example.Panacea.timetable.repository.TimetableEntryRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import java.time.DayOfWeek;

import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Validates the core safety net of the timetable engine: even if application-level
 * scheduling logic has a bug, the database itself must reject a staff member being
 * double-booked into the same (day, period) slot.
 */
@DataJpaTest
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class TimetableEntryConstraintTest {

    @Autowired
    private TimetableEntryRepository timetableEntryRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void rejectsSecondEntryForSameStaffDayAndPeriod() {
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
        Subject mathsSubject = persist(Subject.builder()
                .name("Maths")
                .credits(3)
                .primaryStaff(staff)
                .semester(semester)
                .build());
        Subject physicsSubject = persist(Subject.builder()
                .name("Physics")
                .credits(3)
                .primaryStaff(staff)
                .semester(semester)
                .build());

        TimetableEntry first = TimetableEntry.builder()
                .subject(mathsSubject)
                .section(section)
                .staff(staff)
                .day(DayOfWeek.MONDAY)
                .period(1)
                .build();
        timetableEntryRepository.saveAndFlush(first);

        TimetableEntry conflicting = TimetableEntry.builder()
                .subject(physicsSubject)
                .section(section)
                .staff(staff)
                .day(DayOfWeek.MONDAY)
                .period(1)
                .build();

        assertThrows(DataIntegrityViolationException.class,
                () -> timetableEntryRepository.saveAndFlush(conflicting));
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
