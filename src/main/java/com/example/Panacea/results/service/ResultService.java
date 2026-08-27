package com.example.Panacea.results.service;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.notifications.service.NotificationEventPublisher;
import com.example.Panacea.results.dto.StudentResultResponse;
import com.example.Panacea.results.dto.UpsertResultRequest;
import com.example.Panacea.results.entity.StudentResult;
import com.example.Panacea.results.repository.StudentResultRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ResultService {

    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final SemesterRepository semesterRepository;
    private final StudentResultRepository studentResultRepository;
    private final NotificationEventPublisher notificationEventPublisher;

    @Transactional
    public StudentResultResponse upsertResult(UpsertResultRequest request) {
        User student = userRepository.findById(request.studentId())
                .orElseThrow(() -> new EntityNotFoundException("Student " + request.studentId() + " not found"));
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new EntityNotFoundException("Subject " + request.subjectId() + " not found"));
        Semester semester = semesterRepository.findById(request.semesterId())
                .orElseThrow(() -> new EntityNotFoundException("Semester " + request.semesterId() + " not found"));

        StudentResult result = studentResultRepository
                .findByStudentIdAndSubjectIdAndSemesterId(request.studentId(), request.subjectId(), request.semesterId())
                .orElseGet(() -> StudentResult.builder()
                        .student(student)
                        .subject(subject)
                        .semester(semester)
                        .build());

        result.setTest1(request.test1());
        result.setTest2(request.test2());
        result.setQuiz(request.quiz());
        result.setExperiential(request.experiential());
        result.setSee(request.see());

        StudentResult saved = studentResultRepository.save(result);

        notificationEventPublisher.publish(saved.getStudent().getId(),
                "Your result for " + saved.getSubject().getName() + " has been published.");

        return StudentResultResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<StudentResultResponse> findByStudent(Long studentId) {
        return studentResultRepository.findByStudentIdOrderBySemesterIdAsc(studentId).stream()
                .map(StudentResultResponse::from)
                .toList();
    }
}
