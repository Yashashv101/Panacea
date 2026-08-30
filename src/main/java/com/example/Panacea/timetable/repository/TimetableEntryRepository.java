package com.example.Panacea.timetable.repository;

import com.example.Panacea.timetable.entity.TimetableEntry;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Long> {

    List<TimetableEntry> findBySectionIdOrderByDayAscPeriodAsc(Long sectionId);

    List<TimetableEntry> findByStaffIdOrderByDayAscPeriodAsc(Long staffId);

    // Global (not section-scoped) staff occupancy — a staff member's existing
    // slots anywhere, not just within one section, are what a real
    // double-booking check must compare against. See
    // TimetableService#scheduleSubjectsForSection.
    List<TimetableEntry> findByStaffIdIn(Collection<Long> staffIds);

    // Clean-regenerate support: wipes exactly the (section, subject) pairs
    // about to be rescheduled before scheduling them again, so re-running
    // Generate for the same course/semester never piles duplicate classes on
    // top of a subject's credit count. A bulk JPQL delete (not a derived
    // findBy+remove) so it executes immediately as one DELETE statement;
    // clearAutomatically evicts any of these rows from the persistence
    // context so the very next SELECT in this transaction sees the deletion.
    @Modifying(clearAutomatically = true)
    @Query("delete from TimetableEntry e where e.section.id = :sectionId and e.subject.id in :subjectIds")
    void deleteBySectionIdAndSubjectIdIn(@Param("sectionId") Long sectionId, @Param("subjectIds") Collection<Long> subjectIds);

    // The student-facing read: only ever published entries for the
    // student's own section — draft entries from a not-yet-saved generation
    // batch must never appear on a student dashboard.
    List<TimetableEntry> findBySectionIdAndPublishedTrueOrderByDayAscPeriodAsc(Long sectionId);

    // The "Save" action: flips every not-yet-published entry for these
    // sections (scoped to this semester's subjects, so publishing one
    // course/semester's batch doesn't touch another semester's draft
    // entries that happen to share a section) to published in one bulk
    // update. Returns the count actually flipped, for the confirmation
    // message.
    @Modifying(clearAutomatically = true)
    @Query("update TimetableEntry e set e.published = true "
            + "where e.section.id in :sectionIds and e.subject.semester.id = :semesterId and e.published = false")
    int publishBySectionIdInAndSemesterId(@Param("sectionIds") Collection<Long> sectionIds, @Param("semesterId") Long semesterId);
}
