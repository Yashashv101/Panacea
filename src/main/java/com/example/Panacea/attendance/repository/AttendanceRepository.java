package com.example.Panacea.attendance.repository;

import com.example.Panacea.attendance.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    boolean existsBySubjectIdAndSectionId(Long subjectId, Long sectionId);
}
