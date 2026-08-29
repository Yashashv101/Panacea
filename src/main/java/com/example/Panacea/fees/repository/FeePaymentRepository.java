package com.example.Panacea.fees.repository;

import com.example.Panacea.fees.entity.FeePayment;
import com.example.Panacea.fees.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FeePaymentRepository extends JpaRepository<FeePayment, Long> {

    Optional<FeePayment> findByIdempotencyKey(String idempotencyKey);

    Optional<FeePayment> findByStripePaymentIntentId(String stripePaymentIntentId);

    List<FeePayment> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    boolean existsByStudentIdAndSemesterIdAndStatus(Long studentId, Long semesterId, PaymentStatus status);

    Optional<FeePayment> findTopByStudentIdAndSemesterIdOrderByCreatedAtDesc(Long studentId, Long semesterId);
}
