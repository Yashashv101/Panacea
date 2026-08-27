package com.example.Panacea.fees.controller;

import com.example.Panacea.fees.dto.ConfirmPaymentRequest;
import com.example.Panacea.fees.dto.FeePaymentResponse;
import com.example.Panacea.fees.dto.InitiatePaymentRequest;
import com.example.Panacea.fees.service.FeePaymentService;
import com.example.Panacea.identity.security.UserPrincipal;
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
@RequestMapping("/api/fees/payments")
@RequiredArgsConstructor
public class FeePaymentController {

    private final FeePaymentService feePaymentService;

    @PostMapping("/initiate")
    @PreAuthorize("hasRole('STUDENT')")
    @ResponseStatus(HttpStatus.CREATED)
    public FeePaymentResponse initiate(@Valid @RequestBody InitiatePaymentRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return feePaymentService.initiate(request, principal.getId());
    }

    @PostMapping("/{idempotencyKey}/confirm")
    @PreAuthorize("hasRole('ADMIN')")
    public FeePaymentResponse confirm(@PathVariable String idempotencyKey,
                                       @Valid @RequestBody ConfirmPaymentRequest request) {
        return feePaymentService.confirm(idempotencyKey, request);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public List<FeePaymentResponse> myPayments(@AuthenticationPrincipal UserPrincipal principal) {
        return feePaymentService.findOwn(principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<FeePaymentResponse> allPayments() {
        return feePaymentService.findAll();
    }
}
