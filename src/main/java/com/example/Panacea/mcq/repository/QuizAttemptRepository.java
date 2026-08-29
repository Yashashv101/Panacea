package com.example.Panacea.mcq.repository;

import com.example.Panacea.mcq.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    Optional<QuizAttempt> findByQuizIdAndStudentId(Long quizId, Long studentId);

    List<QuizAttempt> findByQuizId(Long quizId);

    // A student can attempt several quizzes for the same subject in one semester;
    // ResultService uses the most recent one as "the quiz mark" for CIE purposes.
    Optional<QuizAttempt> findFirstByStudentIdAndQuizSubjectIdOrderBySubmittedAtDesc(Long studentId, Long subjectId);
}
