package com.example.Panacea.results.controller;

import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.results.dto.StudentResultResponse;
import com.example.Panacea.results.dto.UpsertResultRequest;
import com.example.Panacea.results.service.ResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/results")
@RequiredArgsConstructor
public class ResultController {

    private final ResultService resultService;

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public StudentResultResponse upsertResult(@Valid @RequestBody UpsertResultRequest request) {
        return resultService.upsertResult(request);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public List<StudentResultResponse> myResults(@AuthenticationPrincipal UserPrincipal principal) {
        return resultService.findByStudent(principal.getId());
    }
}
