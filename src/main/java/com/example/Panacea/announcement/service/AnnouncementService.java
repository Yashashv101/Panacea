package com.example.Panacea.announcement.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.announcement.dto.AnnouncementResponse;
import com.example.Panacea.announcement.dto.CreateAnnouncementRequest;
import com.example.Panacea.announcement.entity.Announcement;
import com.example.Panacea.announcement.entity.AnnouncementAudience;
import com.example.Panacea.announcement.repository.AnnouncementRepository;
import com.example.Panacea.identity.entity.Role;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import com.example.Panacea.identity.security.HodScopeResolver;
import com.example.Panacea.identity.security.UserPrincipal;
import com.example.Panacea.notifications.service.NotificationEventPublisher;
import com.example.Panacea.student.entity.StudentProfile;
import com.example.Panacea.student.repository.StudentProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final NotificationEventPublisher notificationEventPublisher;
    private final HodScopeResolver hodScopeResolver;

    @Transactional
    public AnnouncementResponse createAnnouncement(CreateAnnouncementRequest request, UserPrincipal principal) {
        User author = principal.getUser();
        Course course = hodScopeResolver.resolveScopeCourse(principal);
        if (course == null) {
            throw new AccessDeniedException("You must be an HOD assigned to a department to create announcements");
        }

        Announcement announcement = announcementRepository.save(Announcement.builder()
                .author(author)
                .course(course)
                .message(request.message())
                .audience(request.audience())
                .build());

        // Resolve recipients in HOD's department based on audience
        Set<Long> recipientIds = new HashSet<>();

        if (request.audience() == AnnouncementAudience.EVERYONE || request.audience() == AnnouncementAudience.STUDENTS) {
            List<StudentProfile> students = studentProfileRepository.findByCourseId(course.getId());
            students.forEach(sp -> recipientIds.add(sp.getUser().getId()));
        }

        if (request.audience() == AnnouncementAudience.EVERYONE || request.audience() == AnnouncementAudience.STAFF) {
            List<User> staffMembers = userRepository.findByRoleAndStaffCourseId(Role.STAFF, course.getId());
            staffMembers.forEach(s -> recipientIds.add(s.getId()));
        }

        // Publish a NotificationEvent for each recipient through the RabbitMQ pipeline
        String notificationMessage = "[" + course.getName() + " Announcement]: " + request.message();
        recipientIds.forEach(recipientId ->
                notificationEventPublisher.publish(recipientId, notificationMessage, "ANNOUNCEMENT"));

        return AnnouncementResponse.from(announcement, recipientIds.size());
    }

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> findDepartmentAnnouncements(UserPrincipal principal) {
        Course course = hodScopeResolver.resolveScopeCourse(principal);
        if (course == null) {
            return List.of();
        }
        return announcementRepository.findByCourseIdOrderByCreatedAtDesc(course.getId()).stream()
                .map(AnnouncementResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> findRelevantForMe(UserPrincipal principal) {
        User user = principal.getUser();
        if (user.getRole() == Role.STUDENT) {
            return studentProfileRepository.findByUserId(user.getId())
                    .map(profile -> announcementRepository.findByCourseIdAndAudienceInOrderByCreatedAtDesc(
                            profile.getCourse().getId(),
                            List.of(AnnouncementAudience.EVERYONE, AnnouncementAudience.STUDENTS)))
                    .orElse(List.of())
                    .stream()
                    .map(AnnouncementResponse::from)
                    .toList();
        } else if (user.getRole() == Role.STAFF) {
            if (user.getStaffCourse() == null) {
                return List.of();
            }
            return announcementRepository.findByCourseIdAndAudienceInOrderByCreatedAtDesc(
                            user.getStaffCourse().getId(),
                            List.of(AnnouncementAudience.EVERYONE, AnnouncementAudience.STAFF))
                    .stream()
                    .map(AnnouncementResponse::from)
                    .toList();
        } else if (user.getRole() == Role.HOD) {
            return findDepartmentAnnouncements(principal);
        }
        return List.of();
    }
}
