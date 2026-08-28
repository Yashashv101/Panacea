package com.example.Panacea.identity;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises GET /api/users through MockMvc against the real UserRepository/Postgres
 * container (no mocking) — proving both the ADMIN-only @PreAuthorize guard and the
 * ?role filter behave against actual persisted rows, not stubbed data.
 */
@SpringBootTest
@AutoConfigureMockMvc
class UserControllerTest extends AbstractPostgresContainerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    @Transactional
    void studentIsForbiddenFromListingUsers() throws Exception {
        User student = userRepository.save(User.builder()
                .email("student-forbidden@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());

        mockMvc.perform(get("/api/users").with(user(new UserPrincipal(student))))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void roleFilterReturnsOnlyStaffUsers() throws Exception {
        User admin = userRepository.save(User.builder()
                .email("admin-filter@example.com")
                .passwordHash("hash")
                .firstName("Ada")
                .lastName("Min")
                .role(Role.ADMIN)
                .build());
        userRepository.save(User.builder()
                .email("staff-filter@example.com")
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .role(Role.STAFF)
                .build());
        userRepository.save(User.builder()
                .email("student-filter@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());

        mockMvc.perform(get("/api/users").param("role", "STAFF").with(user(new UserPrincipal(admin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].email").value("staff-filter@example.com"))
                .andExpect(jsonPath("$[0].role").value("STAFF"));
    }
}
