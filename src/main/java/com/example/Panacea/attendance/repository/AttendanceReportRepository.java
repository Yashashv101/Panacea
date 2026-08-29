package com.example.Panacea.attendance.repository;

import com.example.Panacea.attendance.entity.AttendanceReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceReportRepository extends JpaRepository<AttendanceReport, Long> {

    interface HistoryEntry {
        LocalDate getDate();
        Integer getPeriod();
        boolean isPresent();
    }

    @Query("select ar.attendance.date as date, ar.attendance.period as period, ar.present as present " +
            "from AttendanceReport ar " +
            "where ar.student.id = :studentId and ar.attendance.subject.id = :subjectId " +
            "order by ar.attendance.date desc, ar.attendance.period desc")
    List<HistoryEntry> findHistoryByStudentIdAndSubjectId(
            @Param("studentId") Long studentId, @Param("subjectId") Long subjectId);

    @Query("select count(ar) from AttendanceReport ar " +
            "where ar.student.id = :studentId and ar.attendance.subject.id = :subjectId")
    long countByStudentIdAndSubjectId(@Param("studentId") Long studentId, @Param("subjectId") Long subjectId);

    @Query("select count(ar) from AttendanceReport ar " +
            "where ar.student.id = :studentId and ar.attendance.subject.id = :subjectId and ar.present = true")
    long countPresentByStudentIdAndSubjectId(@Param("studentId") Long studentId, @Param("subjectId") Long subjectId);
}
