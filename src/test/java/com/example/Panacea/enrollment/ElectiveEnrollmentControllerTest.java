package com.example.Panacea.enrollment;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.entity.SubjectType;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.student.entity.StudentProfile;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the two behaviors this endpoint now depends on StudentProfile for: a
 * caller-supplied semesterId can no longer steer which semester's electives
 * come back (the controller doesn't even declare the param anymore — MockMvc
 * still sends it as an ordinary query string param, proving Spring silently
 * ignores it rather than erroring, which is what "removed for this purpose"
 * actually needs to mean), and a STUDENT with no profile row gets a specific
 * 404 instead of a crash.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ElectiveEnrollmentControllerTest extends AbstractPostgresContainerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void ignoresAnyCallerSuppliedSemesterIdAndUsesTheStudentsOwnProfile() throws Exception {
        Course course = persist(Course.builder().name("BSc CS").build());
        Section section = persist(Section.builder().name("A").course(course).build());
        Semester ownSemester = persist(Semester.builder().number(1).label("Semester 1").build());
        Semester otherSemester = persist(Semester.builder().number(2).label("Semester 2").build());

        persist(Subject.builder()
                .name("Robotics").credits(3).type(SubjectType.ELECTIVE).semester(ownSemester).build());
        persist(Subject.builder()
                .name("Cryptography").credits(3).type(SubjectType.ELECTIVE).semester(otherSemester).build());

        User student = persist(User.builder()
                .email("student-electives@example.com").passwordHash("hash")
                .firstName("Sam").lastName("Roe").role(Role.STUDENT).build());
        persist(StudentProfile.builder().user(student).course(course).section(section).semester(ownSemester).build());

        mockMvc.perform(get("/api/enrollment/electives")
                        .param("semesterId", String.valueOf(otherSemester.getId()))
                        .with(user(new UserPrincipal(student))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Robotics"));
    }

    @Test
    @Transactional
    void studentWithNoProfileGetsAClearErrorNotACrash() throws Exception {
        User student = persist(User.builder()
                .email("student-noprofile@example.com").passwordHash("hash")
                .firstName("Sam").lastName("Roe").role(Role.STUDENT).build());

        mockMvc.perform(get("/api/enrollment/electives").with(user(new UserPrincipal(student))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value(
                        "Your enrollment isn't set up yet — ask an administrator to assign your course, "
                                + "section and semester"));
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
