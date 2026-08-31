package com.example.Panacea.announcement.repository;

import com.example.Panacea.announcement.entity.Announcement;
import com.example.Panacea.announcement.entity.AnnouncementAudience;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    List<Announcement> findByCourseIdOrderByCreatedAtDesc(Long courseId);

    List<Announcement> findByCourseIdAndAudienceInOrderByCreatedAtDesc(Long courseId, Collection<AnnouncementAudience> audiences);
}
