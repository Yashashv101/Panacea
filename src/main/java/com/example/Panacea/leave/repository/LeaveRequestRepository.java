package com.example.Panacea.leave.repository;

import com.example.Panacea.leave.entity.LeaveRequest;
import com.example.Panacea.leave.entity.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    List<LeaveRequest> findByRequesterIdOrderByStartDateDesc(Long requesterId);

    List<LeaveRequest> findByStatusOrderByStartDateDesc(LeaveStatus status);

    List<LeaveRequest> findAllByOrderByStartDateDesc();
}
