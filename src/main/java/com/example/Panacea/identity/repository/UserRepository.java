package com.example.Panacea.identity.repository;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    boolean existsByHodCourseId(Long courseId);
}
