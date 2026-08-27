package com.example.Panacea.mcq.repository;

import com.example.Panacea.mcq.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
}
