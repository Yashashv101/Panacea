package com.example.Panacea.mcq.controller;

import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.mcq.dto.CreateQuizRequest;
import com.example.Panacea.mcq.dto.QuizAttemptResponse;
import com.example.Panacea.mcq.dto.QuizResponse;
import com.example.Panacea.mcq.dto.SubmitQuizAttemptRequest;
import com.example.Panacea.mcq.service.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/mcq/quizzes")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @PostMapping
    @PreAuthorize("hasRole('STAFF')")
    @ResponseStatus(HttpStatus.CREATED)
    public QuizResponse create(@Valid @RequestBody CreateQuizRequest request,
                                @AuthenticationPrincipal UserPrincipal principal) {
        return quizService.createQuiz(request, principal.getId());
    }

    @GetMapping
    public List<QuizResponse> findAll() {
        return quizService.findAll();
    }

    @GetMapping("/{id}")
    public QuizResponse findById(@PathVariable Long id) {
        return quizService.findById(id);
    }

    @PostMapping("/{id}/attempts")
    @PreAuthorize("hasRole('STUDENT')")
    public QuizAttemptResponse attempt(@PathVariable Long id,
                                        @Valid @RequestBody SubmitQuizAttemptRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return quizService.attempt(id, request, principal.getId());
    }

    @GetMapping("/{id}/attempts/me")
    @PreAuthorize("hasRole('STUDENT')")
    public QuizAttemptResponse myAttempt(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return quizService.findOwnAttempt(id, principal.getId());
    }

    @GetMapping("/{id}/attempts")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'HOD')")
    public List<QuizAttemptResponse> attempts(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return quizService.findAttempts(id, principal.getId());
    }
}
