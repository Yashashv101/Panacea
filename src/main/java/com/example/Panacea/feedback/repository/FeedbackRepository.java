package com.example.Panacea.feedback.repository;

import com.example.Panacea.feedback.entity.Feedback;
import com.example.Panacea.feedback.entity.FeedbackStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    List<Feedback> findBySubmitterIdOrderByIdDesc(Long submitterId);

    List<Feedback> findByStatusOrderByIdDesc(FeedbackStatus status);

    List<Feedback> findAllByOrderByIdDesc();
}
