package com.example.Panacea.proctor.repository;

import com.example.Panacea.proctor.entity.ProctorAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProctorAssignmentRepository extends JpaRepository<ProctorAssignment, Long> {

    long countByStaffId(Long staffId);

    boolean existsByStaffIdAndExamSessionReference(Long staffId, String examSessionReference);

    List<ProctorAssignment> findByStaffId(Long staffId);
}
