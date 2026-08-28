package com.example.Panacea.feedback;

import com.example.Panacea.feedback.entity.Feedback;
import com.example.Panacea.feedback.entity.FeedbackStatus;
import com.example.Panacea.feedback.repository.FeedbackRepository;
import com.example.Panacea.feedback.service.FeedbackService;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.testsupport.AbstractPostgresContainerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises GET /api/feedback through MockMvc against the real repository/Postgres
 * container (no mocking) — proving both the ADMIN-only @PreAuthorize guard and the
 * ?status filter behave against actual persisted rows.
 */
@SpringBootTest
@AutoConfigureMockMvc
class FeedbackControllerTest extends AbstractPostgresContainerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private FeedbackService feedbackService;

    @Test
    @Transactional
    void studentIsForbiddenFromListingFeedback() throws Exception {
        User student = userRepository.save(User.builder()
                .email("student-feedback-forbidden@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());

        mockMvc.perform(get("/api/feedback").with(user(new UserPrincipal(student))))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void statusFilterReturnsOnlyOpenFeedback() throws Exception {
        User admin = userRepository.save(User.builder()
                .email("admin-feedback-filter@example.com")
                .passwordHash("hash")
                .firstName("Ada")
                .lastName("Min")
                .role(Role.ADMIN)
                .build());
        User student = userRepository.save(User.builder()
                .email("student-feedback-filter@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());

        feedbackRepository.save(Feedback.builder()
                .submitter(student)
                .message("Open message")
                .status(FeedbackStatus.OPEN)
                .build());
        feedbackRepository.save(Feedback.builder()
                .submitter(student)
                .message("Resolved message")
                .reply("Handled")
                .status(FeedbackStatus.RESOLVED)
                .build());

        mockMvc.perform(get("/api/feedback").param("status", "OPEN").with(user(new UserPrincipal(admin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].message").value("Open message"))
                .andExpect(jsonPath("$[0].status").value("OPEN"));
    }

    /**
     * Mirrors decide()'s guard on LeaveService: an action meant for an open item
     * must reject once that item is no longer open, rather than silently mutating
     * a closed record.
     */
    @Test
    @Transactional
    void replyIsRejectedOnAnAlreadyResolvedItem() {
        User student = userRepository.save(User.builder()
                .email("student-feedback-reply-resolved@example.com")
                .passwordHash("hash")
                .firstName("Sam")
                .lastName("Roe")
                .role(Role.STUDENT)
                .build());

        Feedback resolved = feedbackRepository.save(Feedback.builder()
                .submitter(student)
                .message("Already handled")
                .reply("Original reply")
                .status(FeedbackStatus.RESOLVED)
                .build());

        assertThrows(IllegalStateException.class, () -> feedbackService.reply(resolved.getId(), "New reply"));
    }
}
