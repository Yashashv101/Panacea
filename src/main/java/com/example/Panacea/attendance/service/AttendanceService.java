package com.example.Panacea.attendance.service;

import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.SectionRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.attendance.dto.AttendancePercentageResponse;
import com.example.Panacea.attendance.dto.AttendanceResponse;
import com.example.Panacea.attendance.dto.MarkAttendanceRequest;
import com.example.Panacea.attendance.entity.Attendance;
import com.example.Panacea.attendance.entity.AttendanceReport;
import com.example.Panacea.attendance.repository.AttendanceReportRepository;
import com.example.Panacea.attendance.repository.AttendanceRepository;
import com.example.Panacea.audit.service.AuditLogService;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.notifications.service.NotificationEventPublisher;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Mirrors the reference system's "one event row + many per-student report rows"
 * pattern: a single {@link Attendance} event is created for the session, then every
 * student's present/absent outcome is bulk-inserted as an {@link AttendanceReport}.
 */
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final SubjectRepository subjectRepository;
    private final SectionRepository sectionRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceReportRepository attendanceReportRepository;
    private final NotificationEventPublisher notificationEventPublisher;
    private final AuditLogService auditLogService;
    private final CacheManager cacheManager;

    static final String PERCENTAGE_CACHE = "attendancePercentage";

    @Transactional
    public AttendanceResponse markAttendance(MarkAttendanceRequest request, Long staffId) {
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new EntityNotFoundException("Subject " + request.subjectId() + " not found"));
        Section section = sectionRepository.findById(request.sectionId())
                .orElseThrow(() -> new EntityNotFoundException("Section " + request.sectionId() + " not found"));
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new EntityNotFoundException("Staff " + staffId + " not found"));

        Attendance attendance = attendanceRepository.save(Attendance.builder()
                .subject(subject)
                .section(section)
                .staff(staff)
                .date(request.date())
                .period(request.period())
                .build());

        List<AttendanceReport> reports = request.students().stream()
                .map(status -> {
                    User student = userRepository.findById(status.studentId())
                            .orElseThrow(() -> new EntityNotFoundException("Student " + status.studentId() + " not found"));
                    return AttendanceReport.builder()
                            .attendance(attendance)
                            .student(student)
                            .present(status.present())
                            .build();
                })
                .toList();
        attendanceReportRepository.saveAll(reports);

        auditLogService.record(staff, "ATTENDANCE_MARK", "Attendance", attendance.getId(),
                "Marked attendance for " + reports.size() + " student(s) in subject " + subject.getId()
                        + " on " + request.date());

        Cache percentageCache = cacheManager.getCache(PERCENTAGE_CACHE);
        reports.forEach(report -> {
            if (percentageCache != null) {
                percentageCache.evict(percentageKey(report.getStudent().getId(), subject.getId()));
            }
            notificationEventPublisher.publish(report.getStudent().getId(),
                    "Attendance for " + subject.getName() + " on " + request.date()
                            + " marked as " + (report.isPresent() ? "present" : "absent") + ".");
        });

        return AttendanceResponse.from(attendance, reports.size());
    }

    @Cacheable(value = PERCENTAGE_CACHE, key = "#studentId + ':' + #subjectId")
    @Transactional(readOnly = true)
    public AttendancePercentageResponse computePercentage(Long studentId, Long subjectId) {
        long total = attendanceReportRepository.countByStudentIdAndSubjectId(studentId, subjectId);
        long present = attendanceReportRepository.countPresentByStudentIdAndSubjectId(studentId, subjectId);
        double percentage = total == 0 ? 0.0 : (present * 100.0) / total;
        return new AttendancePercentageResponse(studentId, subjectId, total, present, percentage);
    }

    private static String percentageKey(Long studentId, Long subjectId) {
        return studentId + ":" + subjectId;
    }
}
