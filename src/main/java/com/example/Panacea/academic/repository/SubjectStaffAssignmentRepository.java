package com.example.Panacea.academic.repository;

import com.example.Panacea.academic.entity.SubjectStaffAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SubjectStaffAssignmentRepository extends JpaRepository<SubjectStaffAssignment, Long> {

    List<SubjectStaffAssignment> findBySubjectId(Long subjectId);

    List<SubjectStaffAssignment> findByStaffId(Long staffId);

    Optional<SubjectStaffAssignment> findBySubjectIdAndSectionId(Long subjectId, Long sectionId);

    List<SubjectStaffAssignment> findBySubjectIdIn(Collection<Long> subjectIds);

    boolean existsBySubjectIdAndStaffId(Long subjectId, Long staffId);

    @Query("select distinct a from SubjectStaffAssignment a " +
            "join a.subject s " +
            "join s.courses c " +
            "where c.id = :courseId")
    List<SubjectStaffAssignment> findByCourseId(@Param("courseId") Long courseId);

    @Query("select distinct a from SubjectStaffAssignment a " +
            "join a.subject s " +
            "where s.semester.id = :semesterId")
    List<SubjectStaffAssignment> findBySemesterId(@Param("semesterId") Long semesterId);

    @Query("select distinct a from SubjectStaffAssignment a " +
            "join a.subject s " +
            "join s.courses c " +
            "where c.id = :courseId and s.semester.id = :semesterId")
    List<SubjectStaffAssignment> findByCourseIdAndSemesterId(@Param("courseId") Long courseId, @Param("semesterId") Long semesterId);

    @Modifying(clearAutomatically = true)
    @Query("delete from SubjectStaffAssignment a where a.subject.id = :subjectId and a.section.id = :sectionId")
    void deleteBySubjectIdAndSectionId(@Param("subjectId") Long subjectId, @Param("sectionId") Long sectionId);

    @Modifying(clearAutomatically = true)
    @Query("delete from SubjectStaffAssignment a where a.subject.id = :subjectId")
    void deleteBySubjectId(@Param("subjectId") Long subjectId);
}
