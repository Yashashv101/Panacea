package com.example.Panacea.risk.service;

import com.example.Panacea.attendance.repository.AttendanceReportRepository;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.results.entity.StudentResult;
import com.example.Panacea.results.repository.StudentResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Computes the raw, explainable signals {@link RiskScoringService} feeds into the
 * logistic regression: overall attendance, overall marks, and whether marks are
 * trending down. Nothing here is ML — just aggregation over existing attendance and
 * results data.
 */
@Service
@RequiredArgsConstructor
public class RiskFeatureService {

    private final AttendanceReportRepository attendanceReportRepository;
    private final StudentResultRepository studentResultRepository;

    @Transactional(readOnly = true)
    public StudentFeatures computeFor(User student) {
        long totalSessions = attendanceReportRepository.countByStudentId(student.getId());
        long presentSessions = attendanceReportRepository.countPresentByStudentId(student.getId());
        double attendancePercentage = totalSessions == 0 ? 0.0 : (presentSessions * 100.0) / totalSessions;

        List<StudentResult> results = studentResultRepository.findByStudentIdOrderBySemesterIdAsc(student.getId());
        double averageMarksPercentage = results.isEmpty() ? 0.0 : results.stream()
                .mapToDouble(r -> r.getTest1() + r.getTest2() + r.getQuiz() + r.getExperiential() + r.getSee())
                .average()
                .orElse(0.0);
        double marksTrend = results.isEmpty() ? 0.0 : results.stream()
                .mapToDouble(r -> r.getTest2() - r.getTest1())
                .average()
                .orElse(0.0);

        return new StudentFeatures(student.getId(), student.getFirstName() + " " + student.getLastName(),
                attendancePercentage, averageMarksPercentage, marksTrend);
    }
}
