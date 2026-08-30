package com.example.Panacea.feedback.controller;

import com.example.Panacea.feedback.dto.FeedbackResponse;
import com.example.Panacea.feedback.dto.ReplyFeedbackRequest;
import com.example.Panacea.feedback.dto.SubmitFeedbackRequest;
import com.example.Panacea.feedback.entity.FeedbackStatus;
import com.example.Panacea.feedback.service.FeedbackService;
import com.example.Panacea.identity.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF')")
    public FeedbackResponse submit(@Valid @RequestBody SubmitFeedbackRequest request,
                                    @AuthenticationPrincipal UserPrincipal principal) {
        return feedbackService.submit(request, principal.getId());
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('STUDENT', 'STAFF')")
    public List<FeedbackResponse> myFeedback(@AuthenticationPrincipal UserPrincipal principal) {
        return feedbackService.findOwn(principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HOD')")
    public List<FeedbackResponse> findAll(@RequestParam(required = false) FeedbackStatus status,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return feedbackService.findAll(status, principal);
    }

    @PostMapping("/{id}/reply")
    @PreAuthorize("hasRole('ADMIN')")
    public FeedbackResponse reply(@PathVariable Long id, @Valid @RequestBody ReplyFeedbackRequest request) {
        return feedbackService.reply(id, request.reply());
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public FeedbackResponse resolve(@PathVariable Long id) {
        return feedbackService.resolve(id);
    }
}
