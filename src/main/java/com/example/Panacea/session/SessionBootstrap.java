package com.example.Panacea.session;

import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.academic.service.SemesterService;
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
 *
 * Same SEMESTERS_PER_SESSION auto-create policy as SessionService.create(),
 * but only for numbers not already present for this Session: backfill runs
 * *before* auto-create precisely so a pre-existing orphaned Semester (e.g.
 * number=1, from before Session existed) gets reattached to currentSession
 * first, and auto-create then only fills in whatever numbers are still
 * missing (2-8) rather than trying to create a second number=1 for the same
 * session and violating the (session_id, number) unique constraint.
 */
@Component
@RequiredArgsConstructor
@Order(1)
public class SessionBootstrap implements CommandLineRunner {

    private static final int SEMESTERS_PER_SESSION = 8;

    private final SessionRepository sessionRepository;
    private final SemesterRepository semesterRepository;
    private final SemesterService semesterService;

    @Override
    @Transactional
    public void run(String... args) {
        boolean isNewSession = !sessionRepository.existsByStartYearAndEndYear(currentStart(), currentEnd());
        Session currentSession = findOrCreateCurrentSession();
        backfillSemestersMissingSession(currentSession);
        if (isNewSession) {
            fillMissingSemesters(currentSession);
        }
    }

    private LocalDate currentStart() {
        LocalDate today = LocalDate.now();
        int startYear = today.getMonth().compareTo(Month.JULY) >= 0 ? today.getYear() : today.getYear() - 1;
        return LocalDate.of(startYear, Month.JULY, 1);
    }

    private LocalDate currentEnd() {
        return currentStart().plusYears(1).minusDays(1);
    }

    private Session findOrCreateCurrentSession() {
        LocalDate start = currentStart();
        LocalDate end = currentEnd();

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

    private void fillMissingSemesters(Session session) {
        for (int number = 1; number <= SEMESTERS_PER_SESSION; number++) {
            if (!semesterRepository.existsBySessionIdAndNumber(session.getId(), number)) {
                semesterService.createForSession(session, number);
            }
        }
    }
}
