package com.example.Panacea.academic.repository;

import com.example.Panacea.academic.entity.Semester;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SemesterRepository extends JpaRepository<Semester, Long> {

    boolean existsByNumber(Integer number);
}
