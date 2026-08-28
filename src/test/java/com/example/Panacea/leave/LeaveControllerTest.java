package com.example.Panacea.leave;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.leave.entity.LeaveRequest;
import com.example.Panacea.leave.entity.LeaveStatus;
import com.example.Panacea.leave.repository.LeaveRequestRepository;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises GET /api/leave/requests through MockMvc against the real repository/Postgres
 * container (no mocking) — proving both the ADMIN-only @PreAuthorize guard and the
 * ?status filter behave against actual persisted rows.
 */
@SpringBootTest
@AutoConfigureMockMvc
class LeaveControllerTest extends AbstractPostgresContainerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Test
    @Transactional
    void staffIsForbiddenFromListingLeaveRequests() throws Exception {
        User staff = userRepository.save(User.builder()
                .email("staff-leave-forbidden@example.com")
                .passwordHash("hash")
                .firstName("Jane")
                .lastName("Doe")
                .role(Role.STAFF)
                .build());

        mockMvc.perform(get("/api/leave/requests").with(user(new UserPrincipal(staff))))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void statusFilterReturnsOnlyPendingRequests() throws Exception {
        User admin = userRepository.save(User.builder()
                .email("admin-leave-filter@example.com")
                .passwordHash("hash")
                .firstName("Ada")
                .lastName("Min")
                .role(Role.ADMIN)
                .build());
        User student = userRepository.save(User.builder()
                .email("student-leave-filter@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());

        leaveRequestRepository.save(LeaveRequest.builder()
                .requester(student)
                .reason("Pending reason")
                .startDate(LocalDate.of(2026, 9, 1))
                .endDate(LocalDate.of(2026, 9, 2))
                .status(LeaveStatus.PENDING)
                .build());
        leaveRequestRepository.save(LeaveRequest.builder()
                .requester(student)
                .reason("Already approved reason")
                .startDate(LocalDate.of(2026, 9, 3))
                .endDate(LocalDate.of(2026, 9, 4))
                .status(LeaveStatus.APPROVED)
                .build());

        mockMvc.perform(get("/api/leave/requests").param("status", "PENDING").with(user(new UserPrincipal(admin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].reason").value("Pending reason"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }
}
