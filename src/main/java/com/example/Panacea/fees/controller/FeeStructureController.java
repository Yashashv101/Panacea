package com.example.Panacea.fees.controller;

import com.example.Panacea.fees.dto.CreateFeeStructureRequest;
import com.example.Panacea.fees.dto.FeeStructureResponse;
import com.example.Panacea.fees.service.FeeStructureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    @GetMapping
    public List<FeeStructureResponse> findAll() {
        return feeStructureService.findAll();
    }
}
