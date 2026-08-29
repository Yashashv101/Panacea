package com.example.Panacea.results.service;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.audit.service.AuditLogService;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.mcq.entity.QuizAttempt;
import com.example.Panacea.mcq.repository.QuizAttemptRepository;
import com.example.Panacea.notifications.service.NotificationEventPublisher;
import com.example.Panacea.results.dto.StudentResultResponse;
import com.example.Panacea.results.dto.UpsertResultRequest;
import com.example.Panacea.results.entity.StudentResult;
import com.example.Panacea.results.repository.StudentResultRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ResultService {

    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;
    private final StudentResultRepository studentResultRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final NotificationEventPublisher notificationEventPublisher;
    private final AuditLogService auditLogService;

    @Transactional
    public StudentResultResponse upsertResult(UpsertResultRequest request, Long actorId) {
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("User " + actorId + " not found"));
        User student = userRepository.findById(request.studentId())
                .orElseThrow(() -> new EntityNotFoundException("Student " + request.studentId() + " not found"));
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new EntityNotFoundException("Subject " + request.subjectId() + " not found"));
        Semester semester = semesterRepository.findById(request.semesterId())
                .orElseThrow(() -> new EntityNotFoundException("Semester " + request.semesterId() + " not found"));

        requireSubjectOwnership(actor, subject);

        StudentResult result = studentResultRepository
                .findByStudentIdAndSubjectIdAndSemesterId(request.studentId(), request.subjectId(), request.semesterId())
                .orElseGet(() -> StudentResult.builder()
                        .student(student)
                        .subject(subject)
                        .semester(semester)
                        .build());

        result.setTest1(request.test1());
        result.setTest2(request.test2());
        result.setExperiential(request.experiential());
        result.setSee(request.see());

        StudentResult saved = studentResultRepository.save(result);

        auditLogService.record(actor, "RESULT_UPSERT", "StudentResult", saved.getId(),
                "Upserted result for student " + student.getId() + " in subject " + subject.getId());

        notificationEventPublisher.publish(saved.getStudent().getId(),
                "Your result for " + saved.getSubject().getName() + " has been published.");

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<StudentResultResponse> findByStudent(Long studentId) {
        return studentResultRepository.findByStudentIdOrderBySemesterIdAsc(studentId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<StudentResultResponse> findOne(Long studentId, Long subjectId, Long semesterId, Long actorId) {
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("User " + actorId + " not found"));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new EntityNotFoundException("Subject " + subjectId + " not found"));

        requireSubjectOwnership(actor, subject);

        return studentResultRepository.findByStudentIdAndSubjectIdAndSemesterId(studentId, subjectId, semesterId)
                .map(this::toResponse);
    }

    private StudentResultResponse toResponse(StudentResult result) {
        Optional<QuizAttempt> latestAttempt = quizAttemptRepository
                .findFirstByStudentIdAndQuizSubjectIdOrderBySubmittedAtDesc(
                        result.getStudent().getId(), result.getSubject().getId());

        Double quizScore = latestAttempt.map(this::quizComponent).orElse(null);
        Double quizMaxScore = latestAttempt.map(this::quizMaxScore).orElse(null);

        return StudentResultResponse.from(result, quizScore, quizMaxScore);
    }

    private double quizComponent(QuizAttempt attempt) {
        return attempt.getQuiz().isRescaleToTen() ? attempt.getRescaledScore() : attempt.getRawScore().doubleValue();
    }

    private double quizMaxScore(QuizAttempt attempt) {
        return attempt.getQuiz().isRescaleToTen() ? 10.0 : attempt.getTotalPossibleMarks().doubleValue();
    }

    private static void requireSubjectOwnership(User actor, Subject subject) {
        if (actor.getRole() == Role.STAFF
                && (subject.getPrimaryStaff() == null || !subject.getPrimaryStaff().getId().equals(actor.getId()))) {
            throw new AccessDeniedException("You are not the primary staff for this subject");
        }
    }
}
