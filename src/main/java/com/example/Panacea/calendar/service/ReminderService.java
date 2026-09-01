package com.example.Panacea.calendar.service;

import com.example.Panacea.calendar.dto.ReminderRequest;
import com.example.Panacea.calendar.dto.ReminderResponse;
import com.example.Panacea.calendar.entity.Reminder;
import com.example.Panacea.calendar.repository.ReminderRepository;
import com.example.Panacea.identity.entity.User;
import com.example.Panacea.identity.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReminderService {

    private final ReminderRepository reminderRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ReminderResponse> getMyReminders(Long userId, LocalDate start, LocalDate end) {
        if (start != null && end != null) {
            return reminderRepository.findByUserIdAndDateBetweenOrderByDateAscCreatedAtAsc(userId, start, end)
                    .stream()
                    .map(ReminderResponse::from)
                    .toList();
        }
        return reminderRepository.findByUserIdOrderByDateAscCreatedAtAsc(userId)
                .stream()
                .map(ReminderResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> getMyRemindersForDate(Long userId, LocalDate date) {
        return reminderRepository.findByUserIdAndDateOrderByCreatedAtAsc(userId, date)
                .stream()
                .map(ReminderResponse::from)
                .toList();
    }

    @Transactional
    public ReminderResponse createReminder(ReminderRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

        Reminder reminder = Reminder.builder()
                .user(user)
                .date(request.date())
                .title(request.title().trim())
                .description(request.description() != null && !request.description().isBlank() ? request.description().trim() : null)
                .time(request.time() != null && !request.time().isBlank() ? request.time().trim() : null)
                .completed(false)
                .build();

        return ReminderResponse.from(reminderRepository.save(reminder));
    }

    @Transactional
    public ReminderResponse toggleComplete(Long id, Long userId) {
        Reminder reminder = findOwnedReminder(id, userId);
        reminder.setCompleted(!reminder.isCompleted());
        return ReminderResponse.from(reminderRepository.save(reminder));
    }

    @Transactional
    public void deleteReminder(Long id, Long userId) {
        reminderRepository.delete(findOwnedReminder(id, userId));
    }

    private Reminder findOwnedReminder(Long id, Long userId) {
        Reminder reminder = reminderRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Reminder not found: " + id));
        if (!reminder.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not own this reminder");
        }
        return reminder;
    }
}
