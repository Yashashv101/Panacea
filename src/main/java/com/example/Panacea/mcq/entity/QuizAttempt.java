package com.example.Panacea.mcq.entity;

import com.example.Panacea.identity.entity.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * The (quiz_id, student_id) unique constraint is the hard guarantee behind
 * "one submission per student per quiz" — enforced at the DB level so a race
 * between two concurrent submissions can't both succeed, not just checked in
 * {@code QuizService} before insert.
 */
@Entity
@Table(name = "quiz_attempts", uniqueConstraints = {
        @UniqueConstraint(name = "uk_quiz_attempt_quiz_student", columnNames = {"quiz_id", "student_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ElementCollection
    @CollectionTable(name = "quiz_attempt_answers", joinColumns = @JoinColumn(name = "attempt_id"))
    @MapKeyColumn(name = "question_id")
    @Column(name = "selected_option_index", nullable = false)
    @Builder.Default
    private Map<Long, Integer> answers = new HashMap<>();

    // Sum of marks for correctly-answered questions, and the sum of all questions'
    // marks at the time of the attempt (kept alongside the score so the ratio stays
    // meaningful even if a quiz's questions are edited later).
    @Column(name = "raw_score", nullable = false)
    private Integer rawScore;

    @Column(name = "total_possible_marks", nullable = false)
    private Integer totalPossibleMarks;

    // Only populated when the quiz's rescaleToTen flag was on at submission time;
    // rawScore/totalPossibleMarks is always kept too so staff can see real performance.
    @Column(name = "rescaled_score")
    private Double rescaledScore;

    @CreationTimestamp
    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;
}
