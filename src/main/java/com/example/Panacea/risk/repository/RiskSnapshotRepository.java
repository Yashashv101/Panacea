package com.example.Panacea.risk.repository;

import com.example.Panacea.risk.entity.RiskSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RiskSnapshotRepository extends JpaRepository<RiskSnapshot, Long> {

    List<RiskSnapshot> findByStudentIdOrderByComputedAtAsc(Long studentId);

    boolean existsByStudentId(Long studentId);
}
