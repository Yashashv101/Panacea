package com.example.Panacea.identity.controller;

import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.identity.service.UserService;
import com.example.Panacea.identity.dto.CreateUserRequest;
import com.example.Panacea.identity.dto.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        User user = userService.createUser(request);
        return UserResponse.from(user);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public List<UserResponse> listUsers(@RequestParam(required = false) Role role,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        if (principal.getUser().getRole() == Role.STAFF && role != Role.STUDENT) {
            throw new AccessDeniedException("Staff may only list students");
        }
        return userService.listUsers(role).stream().map(UserResponse::from).toList();
    }
}
