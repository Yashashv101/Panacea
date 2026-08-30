package com.example.Panacea.mcq.service;

import com.example.Panacea.academic.entity.Subject;
import com.example.Panacea.academic.repository.SubjectRepository;
import com.example.Panacea.academic.security.SubjectOwnershipGuard;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.HodScopeResolver;
import com.example.Panacea.mcq.dto.CreateQuizRequest;
import com.example.Panacea.mcq.dto.QuizAttemptResponse;
import com.example.Panacea.mcq.dto.QuizResponse;
import com.example.Panacea.mcq.dto.SubmitQuizAttemptRequest;
import com.example.Panacea.mcq.entity.Question;
import com.example.Panacea.mcq.entity.Quiz;
import com.example.Panacea.mcq.entity.QuizAttempt;
import com.example.Panacea.mcq.repository.QuizAttemptRepository;
import com.example.Panacea.mcq.repository.QuizRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final QuizRepository quizRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final HodScopeResolver hodScopeResolver;
    private final SubjectOwnershipGuard subjectOwnershipGuard;

    @Transactional
    public QuizResponse createQuiz(CreateQuizRequest request, Long staffId) {
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> new EntityNotFoundException("Subject " + request.subjectId() + " not found"));
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new EntityNotFoundException("User " + staffId + " not found"));

        subjectOwnershipGuard.requireOwnership(staff, subject);

        Quiz quiz = Quiz.builder()
                .title(request.title())
                .subject(subject)
                .staff(staff)
                .rescaleToTen(request.rescaleToTen())
                .build();
        List<Question> questions = request.questions().stream()
                .map(questionRequest -> toQuestion(questionRequest, quiz))
                .toList();
        quiz.setQuestions(new ArrayList<>(questions));

        return QuizResponse.from(quizRepository.save(quiz));
    }

    private Question toQuestion(CreateQuizRequest.QuestionRequest request, Quiz quiz) {
        if (request.correctOptionIndex() < 0 || request.correctOptionIndex() >= request.options().size()) {
            throw new IllegalArgumentException(
                    "correctOptionIndex is out of bounds for question: " + request.text());
        }
        int marks = request.marks() != null ? request.marks() : 1;
        return Question.builder()
                .quiz(quiz)
                .text(request.text())
                .options(new ArrayList<>(request.options()))
                .correctOptionIndex(request.correctOptionIndex())
                .marks(marks)
                .build();
    }

    @Transactional(readOnly = true)
    public QuizResponse findById(Long quizId) {
        return QuizResponse.from(quizRepository.findById(quizId)
                .orElseThrow(() -> new EntityNotFoundException("Quiz " + quizId + " not found")));
    }

    @Transactional(readOnly = true)
    public List<QuizResponse> findAll() {
        return quizRepository.findAll().stream().map(QuizResponse::from).toList();
    }

    @Transactional
    public QuizAttemptResponse attempt(Long quizId, SubmitQuizAttemptRequest request, Long studentId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new EntityNotFoundException("Quiz " + quizId + " not found"));
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new EntityNotFoundException("User " + studentId + " not found"));

        if (quizAttemptRepository.findByQuizIdAndStudentId(quizId, studentId).isPresent()) {
            throw new IllegalStateException("Student " + studentId + " has already attempted quiz " + quizId);
        }

        int rawScore = 0;
        int totalPossibleMarks = 0;
        for (Question question : quiz.getQuestions()) {
            totalPossibleMarks += question.getMarks();
            Integer selected = request.answers().get(question.getId());
            if (selected != null && selected.equals(question.getCorrectOptionIndex())) {
                rawScore += question.getMarks();
            }
        }

        Double rescaledScore = quiz.isRescaleToTen()
                ? (totalPossibleMarks == 0 ? 0.0 : (rawScore / (double) totalPossibleMarks) * 10.0)
                : null;

        QuizAttempt attempt = QuizAttempt.builder()
                .quiz(quiz)
                .student(student)
                .answers(new HashMap<>(request.answers()))
                .rawScore(rawScore)
                .totalPossibleMarks(totalPossibleMarks)
                .rescaledScore(rescaledScore)
                .build();

        // The (quiz, student) unique constraint is the hard guarantee against a
        // duplicate submission slipping through a race with the check above.
        return QuizAttemptResponse.from(quizAttemptRepository.saveAndFlush(attempt));
    }

    @Transactional(readOnly = true)
    public QuizAttemptResponse findOwnAttempt(Long quizId, Long studentId) {
        return QuizAttemptResponse.from(quizAttemptRepository.findByQuizIdAndStudentId(quizId, studentId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No attempt by student " + studentId + " for quiz " + quizId)));
    }

    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> findAttempts(Long quizId, Long actorId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new EntityNotFoundException("Quiz " + quizId + " not found"));
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new EntityNotFoundException("User " + actorId + " not found"));

        subjectOwnershipGuard.requireOwnership(actor, quiz.getSubject());
        requireHodScopeAllowsSubject(actor, quiz.getSubject());

        return quizAttemptRepository.findByQuizId(quizId).stream().map(QuizAttemptResponse::from).toList();
    }

    /**
     * A single quiz's attempt roster, so a wrong-department HOD is rejected
     * outright (403) via HodScopeResolver#requireCourseAccess — the same
     * reject-not-filter treatment SubjectOwnershipGuard above already applies
     * to a STAFF member who isn't this subject's primaryStaff. Scoped via the
     * subject's primaryStaff.staffCourse: no Subject.courses membership
     * check, since a Subject's ManyToMany courses set doesn't identify a
     * single owning department the way primaryStaff (a single STAFF user
     * with one staffCourse) does.
     */
    private void requireHodScopeAllowsSubject(User actor, Subject subject) {
        User primaryStaff = subject.getPrimaryStaff();
        Long staffCourseId = primaryStaff != null && primaryStaff.getStaffCourse() != null
                ? primaryStaff.getStaffCourse().getId() : null;
        hodScopeResolver.requireCourseAccess(actor, staffCourseId);
    }
}
