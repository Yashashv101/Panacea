package com.example.Panacea.identity.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.dto.CreateUserRequest;
import com.example.Panacea.identity.dto.UpdateUserRequest;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.HodScopeResolver;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.student.service.StudentProfileService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final StudentProfileService studentProfileService;
    private final CourseRepository courseRepository;
    private final HodScopeResolver hodScopeResolver;

    /**
     * Reference implementation of HOD department-scoping (see
     * HodScopeResolver's javadoc for the full endpoint list this pattern is
     * meant to extend to next). ADMIN — or anyone HodScopeResolver returns
     * null for — is unfiltered, exactly like before. An HOD is scoped to
     * their own hodCourse: STUDENT rows are filtered via
     * StudentProfile.course (StudentProfileService#findUsersInCourse),
     * STAFF rows via User.staffCourse directly. role=null combines both
     * course-scoped sets; role=ADMIN or role=HOD requested by a scoped HOD
     * returns empty, since neither ADMIN nor HOD rows carry a course
     * membership this scoping concept applies to.
     */
    @Transactional(readOnly = true)
    public List<User> listUsers(Role role, UserPrincipal principal) {
        Course scopeCourse = hodScopeResolver.resolveScopeCourse(principal);
        if (scopeCourse == null) {
            return role != null ? userRepository.findByRole(role) : userRepository.findAll();
        }

        if (role == Role.STUDENT) {
            return studentProfileService.findUsersInCourse(scopeCourse.getId());
        }
        if (role == Role.STAFF) {
            return userRepository.findByRoleAndStaffCourseId(Role.STAFF, scopeCourse.getId());
        }
        if (role == null) {
            List<User> scoped = new ArrayList<>(studentProfileService.findUsersInCourse(scopeCourse.getId()));
            scoped.addAll(userRepository.findByRoleAndStaffCourseId(Role.STAFF, scopeCourse.getId()));
            return scoped;
        }
        return List.of();
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

        if (user.getRole() == Role.HOD) {
            user.setHodCourse(resolveHodCourse(request.courseId()));
        }

        if (user.getRole() == Role.STAFF) {
            user.setStaffCourse(resolveStaffCourse(request.courseId()));
        }

        User saved = userRepository.save(user);

        if (saved.getRole() == Role.STUDENT) {
            studentProfileService.createOrUpdate(saved, request.courseId(), request.sectionId(), request.semesterId());
        }

        return saved;
    }

    /**
     * Required-when-HOD, same cross-field pattern StudentProfileService applies for
     * STUDENT: courseId must be present, and the Course must not already have a
     * HOD. The existsByHodCourseId check gives a clean 409 instead of surfacing a
     * raw DB constraint violation; the column's own unique constraint (see
     * User.hodCourse) is still the real guarantee under concurrent requests.
     */
    private Course resolveHodCourse(Long courseId) {
        if (courseId == null) {
            throw new IllegalArgumentException("course is required for a HOD user");
        }
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course " + courseId + " not found"));
        if (userRepository.existsByHodCourseId(courseId)) {
            throw new IllegalArgumentException("Course '" + course.getName() + "' already has a HOD");
        }
        return course;
    }

    /**
     * Required-when-STAFF, same cross-field pattern as resolveHodCourse above —
     * except there's no existsBy*-style uniqueness check, since a department can
     * have any number of staff.
     */
    private Course resolveStaffCourse(Long courseId) {
        if (courseId == null) {
            throw new IllegalArgumentException("course is required for a STAFF user");
        }
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Course " + courseId + " not found"));
    }

    /**
     * Dedicated lock/unlock action, ADMIN-only at the controller. Distinct from
     * updateUser's own `enabled` field (which still works) because that endpoint
     * requires the full profile payload — firstName/lastName/courseId — just to
     * flip one flag; this is the single-purpose action the Users.jsx row toggle
     * calls.
     */
    @Transactional
    public User setEnabled(Long id, boolean enabled) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User " + id + " not found"));
        user.setEnabled(enabled);
        return user;
    }

    /**
     * Admin-initiated password reset: the admin supplies the new password
     * directly (no random-temp-password-shown-once flow) since there is no
     * email infrastructure in this project to deliver a temp password out of
     * band anyway, and the admin already has a secure channel to the user by
     * virtue of being the one who resets it. @Size(min = 8) on the DTO matches
     * CreateUserRequest's own password rule.
     */
    @Transactional
    public User resetPassword(Long id, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User " + id + " not found"));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        return user;
    }

    @Transactional
    public User updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User " + id + " not found"));

        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEnabled(request.enabled());

        if (user.getRole() == Role.STAFF) {
            user.setStaffCourse(resolveStaffCourse(request.courseId()));
        }

        User saved = userRepository.save(user);

        if (saved.getRole() == Role.STUDENT) {
            studentProfileService.createOrUpdate(saved, request.courseId(), request.sectionId(), request.semesterId());
        }

        return saved;
    }
}
