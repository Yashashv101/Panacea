package com.example.Panacea.identity;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${panacea.security.bootstrap-admin.email:}")
    private String bootstrapEmail;

    @Value("${panacea.security.bootstrap-admin.password:}")
    private String bootstrapPassword;

    @Override
    @Transactional
    public void run(String... args) {
        if (bootstrapEmail.isBlank() || bootstrapPassword.isBlank()) {
            return;
        }
        if (userRepository.existsByEmail(bootstrapEmail)) {
            return;
        }

        User admin = User.builder()
                .email(bootstrapEmail)
                .passwordHash(passwordEncoder.encode(bootstrapPassword))
                .firstName("System")
                .lastName("Admin")
                .role(Role.ADMIN)
                .enabled(true)
                .build();

        userRepository.save(admin);
    }
}
