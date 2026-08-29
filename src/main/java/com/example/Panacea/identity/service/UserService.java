package com.example.Panacea.identity.service;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.dto.CreateUserRequest;
import com.example.Panacea.identity.dto.UpdateUserRequest;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.student.service.StudentProfileService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final StudentProfileService studentProfileService;

    @Transactional(readOnly = true)
    public List<User> listUsers(Role role) {
        return role != null ? userRepository.findByRole(role) : userRepository.findAll();
    }

    @Transactional
    public User createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("A user with email " + request.email() + " already exists");
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .role(request.role())
                .enabled(true)
                .build();

        User saved = userRepository.save(user);

        if (saved.getRole() == Role.STUDENT) {
            studentProfileService.createOrUpdate(saved, request.courseId(), request.sectionId(), request.semesterId());
        }

        return saved;
    }

    @Transactional
    public User updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User " + id + " not found"));

        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEnabled(request.enabled());
        User saved = userRepository.save(user);

        if (saved.getRole() == Role.STUDENT) {
            studentProfileService.createOrUpdate(saved, request.courseId(), request.sectionId(), request.semesterId());
        }

        return saved;
    }
}
