package com.example.Panacea.fees.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.fees.dto.CreateFeeStructureRequest;
import com.example.Panacea.fees.dto.FeeStructureResponse;
import com.example.Panacea.fees.entity.FeeStructure;
import com.example.Panacea.fees.repository.FeeStructureRepository;
import com.example.Panacea.student.entity.StudentProfile;
import com.example.Panacea.student.service.StudentProfileService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeeStructureService {

    private final FeeStructureRepository feeStructureRepository;
    private final CourseRepository courseRepository;
    private final SemesterRepository semesterRepository;
    private final StudentProfileService studentProfileService;

    @Transactional
    public FeeStructureResponse create(CreateFeeStructureRequest request) {
        Course course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Course " + request.courseId() + " not found"));
        Semester semester = semesterRepository.findById(request.semesterId())
                .orElseThrow(() -> new EntityNotFoundException("Semester " + request.semesterId() + " not found"));

        FeeStructure feeStructure = FeeStructure.builder()
                .course(course)
                .semester(semester)
                .tuitionAmount(request.tuitionAmount())
                .examFeeAmount(request.examFeeAmount())
                .build();

        return FeeStructureResponse.from(feeStructureRepository.save(feeStructure));
    }

    @Transactional
    public FeeStructureResponse update(Long id, CreateFeeStructureRequest request) {
        FeeStructure feeStructure = feeStructureRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Fee structure " + id + " not found"));
        Course course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Course " + request.courseId() + " not found"));
        Semester semester = semesterRepository.findById(request.semesterId())
                .orElseThrow(() -> new EntityNotFoundException("Semester " + request.semesterId() + " not found"));

        feeStructure.setCourse(course);
        feeStructure.setSemester(semester);
        feeStructure.setTuitionAmount(request.tuitionAmount());
        feeStructure.setExamFeeAmount(request.examFeeAmount());

        return FeeStructureResponse.from(feeStructure);
    }

    @Transactional(readOnly = true)
    public List<FeeStructureResponse> findAll() {
        return feeStructureRepository.findAll().stream().map(FeeStructureResponse::from).toList();
    }

    /**
     * The student-facing "what am I about to pay" breakdown — same resolution
     * FeePaymentService#initiate uses internally (see {@link #resolveForStudent}),
     * surfaced read-only so a student can see it before ever calling initiate.
     */
    @Transactional(readOnly = true)
    public FeeStructureResponse findForStudent(Long studentId) {
        return FeeStructureResponse.from(resolveForStudent(studentId));
    }

    /**
     * Resolves the applicable FeeStructure for a student from their own
     * StudentProfile (course + semester) — never from a client-supplied
     * course/semester — so FeePaymentService#initiate and the read-only
     * breakdown above always agree on exactly the same row.
     */
    @Transactional(readOnly = true)
    public FeeStructure resolveForStudent(Long studentId) {
        StudentProfile profile = studentProfileService.getByUserId(studentId);
        return feeStructureRepository
                .findByCourseIdAndSemesterId(profile.getCourse().getId(), profile.getSemester().getId())
                .orElseThrow(() -> new EntityNotFoundException("No fee structure for course "
                        + profile.getCourse().getId() + " and semester " + profile.getSemester().getId()));
    }
}
