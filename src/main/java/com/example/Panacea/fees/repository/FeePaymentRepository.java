package com.example.Panacea.fees.repository;

import com.example.Panacea.fees.entity.FeePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FeePaymentRepository extends JpaRepository<FeePayment, Long> {

    Optional<FeePayment> findByIdempotencyKey(String idempotencyKey);

    List<FeePayment> findByStudentIdOrderByCreatedAtDesc(Long studentId);
}
