package com.example.Panacea.calendar.service;

import com.example.Panacea.calendar.dto.CollegeEventRequest;
import com.example.Panacea.calendar.entity.CollegeEvent;
import com.example.Panacea.calendar.repository.CollegeEventRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CollegeEventService {

    private final CollegeEventRepository collegeEventRepository;

    @Transactional(readOnly = true)
    public List<CollegeEvent> findAll() {
        return collegeEventRepository.findAll();
    }

    @Transactional(readOnly = true)
    public CollegeEvent findById(Long id) {
        return collegeEventRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("College event " + id + " not found"));
    }

    @Transactional
    public CollegeEvent create(CollegeEventRequest request) {
        return collegeEventRepository.save(CollegeEvent.builder()
                .date(request.date())
                .title(request.title())
                .description(request.description())
                .timeOfDay(request.timeOfDay())
                .location(request.location())
                .build());
    }

    @Transactional
    public CollegeEvent update(Long id, CollegeEventRequest request) {
        CollegeEvent event = findById(id);
        event.setDate(request.date());
        event.setTitle(request.title());
        event.setDescription(request.description());
        event.setTimeOfDay(request.timeOfDay());
        event.setLocation(request.location());
        return event;
    }

    @Transactional
    public void delete(Long id) {
        if (!collegeEventRepository.existsById(id)) {
            throw new EntityNotFoundException("College event " + id + " not found");
        }
        collegeEventRepository.deleteById(id);
    }
}
