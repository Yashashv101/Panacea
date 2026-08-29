package com.example.Panacea.proctor.repository;

import com.example.Panacea.proctor.entity.AssignmentType;
import com.example.Panacea.proctor.entity.ProctorAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProctorAssignmentRepository extends JpaRepository<ProctorAssignment, Long> {

    long countByStaffIdAndAssignmentType(Long staffId, AssignmentType assignmentType);

    boolean existsByStaffIdAndExamSessionReferenceAndAssignmentType(
            Long staffId, String examSessionReference, AssignmentType assignmentType);

    Optional<ProctorAssignment> findByStudentIdAndAssignmentType(Long studentId, AssignmentType assignmentType);

    List<ProctorAssignment> findByStaffId(Long staffId);

    List<ProctorAssignment> findByStaffIdAndAssignmentType(Long staffId, AssignmentType assignmentType);
}
