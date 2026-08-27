package com.example.Panacea.fees.service;

import com.example.Panacea.fees.dto.ConfirmPaymentRequest;
import com.example.Panacea.fees.dto.FeePaymentResponse;
import com.example.Panacea.fees.dto.InitiatePaymentRequest;
import com.example.Panacea.fees.entity.FeePayment;
import com.example.Panacea.fees.entity.FeeStructure;
import com.example.Panacea.fees.entity.PaymentStatus;
import com.example.Panacea.fees.repository.FeePaymentRepository;
import com.example.Panacea.fees.repository.FeeStructureRepository;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FeePaymentService {

    private final FeePaymentRepository feePaymentRepository;
    private final FeeStructureRepository feeStructureRepository;
    private final UserRepository userRepository;

    @Transactional
    public FeePaymentResponse initiate(InitiatePaymentRequest request, Long studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("User " + studentId + " not found"));
        FeeStructure feeStructure = feeStructureRepository
                .findByCourseIdAndSemesterId(request.courseId(), request.semesterId())
                .orElseThrow(() -> new EntityNotFoundException("No fee structure for course "
                        + request.courseId() + " and semester " + request.semesterId()));

        // amount is always taken from the fee structure, never from the client
        FeePayment payment = FeePayment.builder()
                .student(student)
                .course(feeStructure.getCourse())
                .semester(feeStructure.getSemester())
                .amount(feeStructure.getAmount())
                .idempotencyKey(UUID.randomUUID().toString())
                .build();

        return FeePaymentResponse.from(feePaymentRepository.save(payment));
    }

    @Transactional
    public FeePaymentResponse confirm(String idempotencyKey, ConfirmPaymentRequest request) {
        if (request.outcome() == PaymentStatus.PENDING) {
            throw new IllegalArgumentException("A payment cannot be confirmed back to PENDING");
        }

        FeePayment payment = feePaymentRepository.findByIdempotencyKey(idempotencyKey)
                .orElseThrow(() -> new EntityNotFoundException("Payment " + idempotencyKey + " not found"));

        if (payment.getStatus() == PaymentStatus.PAID) {
            // Already settled: a repeat webhook delivery for the same key is a
            // no-op, not a re-process — a PAID payment can never be re-marked.
            return FeePaymentResponse.from(payment);
        }

        payment.setStatus(request.outcome());
        payment.setPaymentReference(request.paymentReference());
        return FeePaymentResponse.from(feePaymentRepository.save(payment));
    }

    @Transactional(readOnly = true)
    public List<FeePaymentResponse> findOwn(Long studentId) {
        return feePaymentRepository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(FeePaymentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FeePaymentResponse> findAll() {
        return feePaymentRepository.findAll().stream().map(FeePaymentResponse::from).toList();
    }
}
