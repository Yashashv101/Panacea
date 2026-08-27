package com.example.Panacea.fees.service;

import com.example.Panacea.academic.entity.Course;
import com.example.Panacea.academic.entity.Semester;
import com.example.Panacea.academic.repository.CourseRepository;
import com.example.Panacea.academic.repository.SemesterRepository;
import com.example.Panacea.fees.dto.CreateFeeStructureRequest;
import com.example.Panacea.fees.dto.FeeStructureResponse;
import com.example.Panacea.fees.entity.FeeStructure;
import com.example.Panacea.fees.repository.FeeStructureRepository;
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

    @Transactional
    public FeeStructureResponse create(CreateFeeStructureRequest request) {
        Course course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new EntityNotFoundException("Course " + request.courseId() + " not found"));
        Semester semester = semesterRepository.findById(request.semesterId())
                .orElseThrow(() -> new EntityNotFoundException("Semester " + request.semesterId() + " not found"));

        FeeStructure feeStructure = FeeStructure.builder()
                .course(course)
                .semester(semester)
                .amount(request.amount())
                .build();

        return FeeStructureResponse.from(feeStructureRepository.save(feeStructure));
    }

    @Transactional(readOnly = true)
    public List<FeeStructureResponse> findAll() {
        return feeStructureRepository.findAll().stream().map(FeeStructureResponse::from).toList();
    }
}
