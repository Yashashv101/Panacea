package com.example.Panacea.fees.repository;

import com.example.Panacea.fees.entity.FeeStructure;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FeeStructureRepository extends JpaRepository<FeeStructure, Long> {

    Optional<FeeStructure> findByCourseIdAndSemesterId(Long courseId, Long semesterId);
}
