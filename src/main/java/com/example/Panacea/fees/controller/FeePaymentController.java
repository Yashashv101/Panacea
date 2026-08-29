package com.example.Panacea.fees.controller;

import com.example.Panacea.fees.dto.FeePaymentResponse;
import com.example.Panacea.fees.service.FeePaymentService;
import com.example.Panacea.identity.security.UserPrincipal;
import com.stripe.exception.StripeException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
    public FeePaymentResponse initiate(@AuthenticationPrincipal UserPrincipal principal) throws StripeException {
        return feePaymentService.initiate(principal.getId());
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
