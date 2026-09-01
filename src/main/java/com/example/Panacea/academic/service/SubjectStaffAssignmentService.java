package com.example.Panacea.academic.service;

import com.example.Panacea.academic.dto.StaffAssignedSubjectSummaryResponse;
import com.example.Panacea.academic.dto.SubjectStaffAssignmentRequest;
import com.example.Panacea.academic.dto.SubjectStaffAssignmentResponse;
import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Section;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.entity.SubjectStaffAssignment;
import com.example.Panacea.academic.repository.SectionRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.academic.repository.SubjectStaffAssignmentRepository;
import com.example.Panacea.academic.security.SubjectOwnershipGuard;
import com.example.Panacea.audit.service.AuditLogService;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.HodScopeResolver;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SubjectStaffAssignmentService {

    private final SubjectStaffAssignmentRepository assignmentRepository;
    private final SubjectRepository subjectRepository;
    private final SectionRepository sectionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final HodScopeResolver hodScopeResolver;
    private final SubjectOwnershipGuard subjectOwnershipGuard;

    @Transactional
    public List<SubjectStaffAssignmentResponse> assignStaff(SubjectStaffAssignmentRequest request, Long actorId) {
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("User " + actorId + " not found"));

        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new EntityNotFoundException("Subject " + request.subjectId() + " not found"));

        hodScopeResolver.requireCourseAccess(actor, subject.getCourses());

        User staff = userRepository.findById(request.staffId())
                .orElseThrow(() -> new EntityNotFoundException("Staff " + request.staffId() + " not found"));
        if (staff.getRole() != Role.STAFF) {
            throw new IllegalArgumentException("User " + request.staffId() + " is not a staff member");
        }

        subjectOwnershipGuard.requireSameDepartment(staff, subject.getCourses(), subject.getName(), "assigned to");

        List<SubjectStaffAssignmentResponse> results = new ArrayList<>();

        for (Long sectionId : request.sectionIds()) {
            Section section = sectionRepository.findById(sectionId)
                    .orElseThrow(() -> new EntityNotFoundException("Section " + sectionId + " not found"));

            Optional<SubjectStaffAssignment> existing = assignmentRepository.findBySubjectIdAndSectionId(subject.getId(), section.getId());
            SubjectStaffAssignment assignment;
            if (existing.isPresent()) {
                assignment = existing.get();
                assignment.setStaff(staff);
            } else {
                assignment = SubjectStaffAssignment.builder()
                        .subject(subject)
                        .section(section)
                        .staff(staff)
                        .build();
            }
            assignmentRepository.save(assignment);
            results.add(SubjectStaffAssignmentResponse.from(assignment));
        }

        // If subject had no primary staff set, keep primaryStaff in sync as a fallback
        if (subject.getPrimaryStaff() == null) {
            subject.setPrimaryStaff(staff);
            subjectRepository.save(subject);
        }

        auditLogService.record(actor, "STAFF_ASSIGNMENT", "Subject", subject.getId(),
                "Assigned staff " + staff.getId() + " to subject " + subject.getId() + " across " + request.sectionIds().size() + " sections");

        return results;
    }

    @Transactional
    public void deleteAssignment(Long assignmentId, Long actorId) {
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("User " + actorId + " not found"));

        SubjectStaffAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assignment " + assignmentId + " not found"));

        hodScopeResolver.requireCourseAccess(actor, assignment.getSubject().getCourses());

        assignmentRepository.delete(assignment);
        auditLogService.record(actor, "STAFF_UNASSIGN", "SubjectStaffAssignment", assignmentId,
                "Removed staff assignment " + assignmentId + " for subject " + assignment.getSubject().getId() + " section " + assignment.getSection().getId());
    }

    @Transactional(readOnly = true)
    public List<SubjectStaffAssignmentResponse> findAll(Long courseId, Long semesterId, Long subjectId, Long staffId, User actor) {
        List<SubjectStaffAssignment> assignments;

        if (courseId != null && semesterId != null) {
            assignments = assignmentRepository.findByCourseIdAndSemesterId(courseId, semesterId);
        } else if (courseId != null) {
            assignments = assignmentRepository.findByCourseId(courseId);
        } else if (semesterId != null) {
            assignments = assignmentRepository.findBySemesterId(semesterId);
        } else if (subjectId != null) {
            assignments = assignmentRepository.findBySubjectId(subjectId);
        } else if (staffId != null) {
            assignments = assignmentRepository.findByStaffId(staffId);
        } else {
            assignments = assignmentRepository.findAll();
        }

        if (actor != null && actor.getRole() == Role.HOD) {
            Course scopeCourse = hodScopeResolver.resolveScopeCourse(actor);
            if (scopeCourse != null) {
                assignments = assignments.stream()
                        .filter(a -> a.getSubject().getCourses().stream().anyMatch(c -> c.getId().equals(scopeCourse.getId())))
                        .toList();
            }
        }

        return assignments.stream()
                .map(SubjectStaffAssignmentResponse::from)
                .sorted(Comparator.comparing(SubjectStaffAssignmentResponse::subjectName)
                        .thenComparing(SubjectStaffAssignmentResponse::sectionName))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StaffAssignedSubjectSummaryResponse> findAssignedSubjectsForStaff(Long staffId) {
        List<SubjectStaffAssignment> assignments = assignmentRepository.findByStaffId(staffId);

        Map<Long, List<SubjectStaffAssignment>> bySubject = new LinkedHashMap<>();
        for (SubjectStaffAssignment a : assignments) {
            bySubject.computeIfAbsent(a.getSubject().getId(), k -> new ArrayList<>()).add(a);
        }

        List<StaffAssignedSubjectSummaryResponse> summaries = new ArrayList<>();
        for (Map.Entry<Long, List<SubjectStaffAssignment>> entry : bySubject.entrySet()) {
            List<SubjectStaffAssignment> list = entry.getValue();
            Subject subject = list.get(0).getSubject();
            Course course = subject.getCourses().isEmpty()
                    ? (list.get(0).getSection().getCourse())
                    : subject.getCourses().iterator().next();

            List<StaffAssignedSubjectSummaryResponse.AssignedSectionSummary> sectionSummaries = list.stream()
                    .map(a -> new StaffAssignedSubjectSummaryResponse.AssignedSectionSummary(
                            a.getSection().getId(),
                            a.getSection().getName()
                    ))
                    .sorted(Comparator.comparing(StaffAssignedSubjectSummaryResponse.AssignedSectionSummary::name))
                    .toList();

            summaries.add(new StaffAssignedSubjectSummaryResponse(
                    subject.getId(),
                    subject.getName(),
                    subject.getCredits(),
                    subject.getType(),
                    course != null ? course.getId() : null,
                    course != null ? course.getName() : null,
                    subject.getSemester() != null ? subject.getSemester().getId() : null,
                    subject.getSemester() != null ? "Semester " + subject.getSemester().getNumber() : null,
                    sectionSummaries
            ));
        }

        summaries.sort(Comparator.comparing(StaffAssignedSubjectSummaryResponse::subjectName));
        return summaries;
    }
}
