package com.example.Panacea.enrollment.repository;

import com.example.Panacea.enrollment.entity.ElectiveEnrollmentRequest;
import com.example.Panacea.enrollment.entity.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ElectiveEnrollmentRequestRepository extends JpaRepository<ElectiveEnrollmentRequest, Long> {

    List<ElectiveEnrollmentRequest> findByStudentIdOrderByIdDesc(Long studentId);

    List<ElectiveEnrollmentRequest> findByMentorIdAndStatusOrderByIdDesc(Long mentorId, EnrollmentStatus status);

    List<ElectiveEnrollmentRequest> findByStatusAndMentorIsNullOrderByIdDesc(EnrollmentStatus status);

    boolean existsByStudentIdAndSubjectIdAndSemesterIdAndStatusIn(
            Long studentId, Long subjectId, Long semesterId, Collection<EnrollmentStatus> statuses);
}
