package com.example.Panacea.attendance.repository;

import com.example.Panacea.attendance.entity.AttendanceReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AttendanceReportRepository extends JpaRepository<AttendanceReport, Long> {

    @Query("select count(ar) from AttendanceReport ar " +
            "where ar.student.id = :studentId and ar.attendance.subject.id = :subjectId")
    long countByStudentIdAndSubjectId(@Param("studentId") Long studentId, @Param("subjectId") Long subjectId);

    @Query("select count(ar) from AttendanceReport ar " +
            "where ar.student.id = :studentId and ar.attendance.subject.id = :subjectId and ar.present = true")
    long countPresentByStudentIdAndSubjectId(@Param("studentId") Long studentId, @Param("subjectId") Long subjectId);

    @Query("select count(ar) from AttendanceReport ar where ar.student.id = :studentId")
    long countByStudentId(@Param("studentId") Long studentId);

    @Query("select count(ar) from AttendanceReport ar where ar.student.id = :studentId and ar.present = true")
    long countPresentByStudentId(@Param("studentId") Long studentId);
}
