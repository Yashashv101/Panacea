package com.example.Panacea.session;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.session.entity.Session;
import com.example.Panacea.session.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Month;
import java.util.List;

/**
 * Session is new as of this rewrite step; existing Semester rows (created
 * before this column existed) have session_id = null. Rather than a
 * migration-tool backfill (this project has none — schema is Hibernate
 * ddl-auto=update), this runner seeds a "current" Session on first boot and
 * points any orphaned Semesters at it, so the FK is never left dangling.
 * Academic year is assumed to run July-June; a boot in Jan-Jun belongs to the
 * academic year that started the previous July.
 */
@Component
@RequiredArgsConstructor
@Order(1)
public class SessionBootstrap implements CommandLineRunner {

    private final SessionRepository sessionRepository;
    private final SemesterRepository semesterRepository;

    @Override
    @Transactional
    public void run(String... args) {
        Session currentSession = findOrCreateCurrentSession();
        backfillSemestersMissingSession(currentSession);
    }

    private Session findOrCreateCurrentSession() {
        LocalDate today = LocalDate.now();
        int startYear = today.getMonth().compareTo(Month.JULY) >= 0 ? today.getYear() : today.getYear() - 1;
        LocalDate start = LocalDate.of(startYear, Month.JULY, 1);
        LocalDate end = LocalDate.of(startYear + 1, Month.JUNE, 30);

        return sessionRepository.findByStartYearAndEndYear(start, end)
                .orElseGet(() -> sessionRepository.save(Session.builder()
                        .startYear(start)
                        .endYear(end)
                        .build()));
    }

    private void backfillSemestersMissingSession(Session currentSession) {
        List<Semester> orphaned = semesterRepository.findAll().stream()
                .filter(semester -> semester.getSession() == null)
                .toList();
        orphaned.forEach(semester -> semester.setSession(currentSession));
    }
}
