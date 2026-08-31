package com.example.Panacea.attendance.service;

import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.SectionRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.attendance.dto.AttendanceHistoryEntryResponse;
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
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.security.HodScopeResolver;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.notifications.service.NotificationEventPublisher;
import com.example.Panacea.student.entity.StudentProfile;
import com.example.Panacea.student.service.StudentProfileService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.AccessDeniedException;
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
    private final StudentProfileService studentProfileService;
    private final HodScopeResolver hodScopeResolver;
    private final com.example.Panacea.academic.security.SubjectOwnershipGuard subjectOwnershipGuard;

    static final String PERCENTAGE_CACHE = "attendancePercentage";

    @Transactional
    public AttendanceResponse markAttendance(MarkAttendanceRequest request, Long staffId) {
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new EntityNotFoundException("Subject " + request.subjectId() + " not found"));
        Section section = sectionRepository.findById(request.sectionId())
                .orElseThrow(() -> new EntityNotFoundException("Section " + request.sectionId() + " not found"));
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new EntityNotFoundException("Staff " + staffId + " not found"));

        subjectOwnershipGuard.requireOwnership(staff, subject);

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

    /**
     * The oversight-lookup guard for GET /percentage/student/{studentId} — a
     * single-student lookup, so a wrong-department HOD is rejected outright
     * (403) via HodScopeResolver#requireCourseAccess rather than silently
     * filtered like the list endpoints. Called as a separate top-level call
     * from the controller (not from inside computePercentage itself) so the
     * @Cacheable proxy on computePercentage below still applies — a
     * self-invocation from within this class would bypass Spring's AOP proxy
     * and silently break caching.
     *
     * The resolveScopeCourse short-circuit before the StudentProfile lookup
     * is deliberate, not redundant with requireCourseAccess's own check: it
     * lets ADMIN/STAFF query any studentId — including one with no
     * StudentProfile row yet — without ever touching StudentProfileService,
     * exactly as before this method called into the shared guard.
     */
    @Transactional(readOnly = true)
    public void requireHodScopeAllowsStudent(Long studentId, UserPrincipal principal) {
        if (hodScopeResolver.resolveScopeCourse(principal) == null) {
            return;
        }
        StudentProfile profile = studentProfileService.getByUserId(studentId);
        hodScopeResolver.requireCourseAccess(principal, profile.getCourse().getId());
    }

    @Cacheable(value = PERCENTAGE_CACHE, key = "#studentId + ':' + #subjectId")
    @Transactional(readOnly = true)
    public AttendancePercentageResponse computePercentage(Long studentId, Long subjectId) {
        long total = attendanceReportRepository.countByStudentIdAndSubjectId(studentId, subjectId);
        long present = attendanceReportRepository.countPresentByStudentIdAndSubjectId(studentId, subjectId);
        double percentage = total == 0 ? 0.0 : (present * 100.0) / total;
        return new AttendancePercentageResponse(studentId, subjectId, total, present, percentage);
    }

    /**
     * Session-by-session history behind the SubjectDetail page's Attendance tab. Guarded
     * the same way the percentage-me endpoint isn't — that endpoint's studentId param
     * already comes from the JWT principal, so a mismatched subjectId just yields an
     * empty/zero result; this one returns individual session dates, so it goes through
     * StudentProfileService#requireSubjectAccessible first.
     */
    @Transactional(readOnly = true)
    public List<AttendanceHistoryEntryResponse> getHistory(Long studentId, Long subjectId) {
        studentProfileService.requireSubjectAccessible(studentId, subjectId);
        return attendanceReportRepository.findHistoryByStudentIdAndSubjectId(studentId, subjectId).stream()
                .map(entry -> new AttendanceHistoryEntryResponse(entry.getDate(), entry.getPeriod(), entry.isPresent()))
                .toList();
    }

    private static String percentageKey(Long studentId, Long subjectId) {
        return studentId + ":" + subjectId;
    }
}
