package com.example.Panacea.fees.controller;

import com.example.Panacea.fees.dto.CreateFeeStructureRequest;
import com.example.Panacea.fees.dto.FeeStructureResponse;
import com.example.Panacea.fees.service.FeeStructureService;
import com.example.Panacea.identity.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/fees/structures")
@RequiredArgsConstructor
public class FeeStructureController {

    private final FeeStructureService feeStructureService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public FeeStructureResponse create(@Valid @RequestBody CreateFeeStructureRequest request) {
        return feeStructureService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public FeeStructureResponse update(@PathVariable Long id, @Valid @RequestBody CreateFeeStructureRequest request) {
        return feeStructureService.update(id, request);
    }

    @GetMapping
    public List<FeeStructureResponse> findAll() {
        return feeStructureService.findAll();
    }

    /**
     * The itemized breakdown a student sees before ever calling
     * POST /fees/payments/initiate — resolved from their own StudentProfile,
     * same as initiate() itself, never from a client-supplied course/semester.
     */
    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public FeeStructureResponse findOwn(@AuthenticationPrincipal UserPrincipal principal) {
        return feeStructureService.findForStudent(principal.getId());
    }
}
