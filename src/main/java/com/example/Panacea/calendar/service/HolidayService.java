package com.example.Panacea.calendar.service;

import com.example.Panacea.calendar.dto.HolidayRequest;
import com.example.Panacea.calendar.entity.Holiday;
import com.example.Panacea.calendar.repository.HolidayRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HolidayService {

    private final HolidayRepository holidayRepository;

    @Transactional(readOnly = true)
    public List<Holiday> findAll() {
        return holidayRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Holiday findById(Long id) {
        return holidayRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Holiday " + id + " not found"));
    }

    @Transactional
    public Holiday create(HolidayRequest request) {
        return holidayRepository.save(Holiday.builder()
                .date(request.date())
                .name(request.name())
                .description(request.description())
                .build());
    }

    @Transactional
    public Holiday update(Long id, HolidayRequest request) {
        Holiday holiday = findById(id);
        holiday.setDate(request.date());
        holiday.setName(request.name());
        holiday.setDescription(request.description());
        return holiday;
    }

    @Transactional
    public void delete(Long id) {
        if (!holidayRepository.existsById(id)) {
            throw new EntityNotFoundException("Holiday " + id + " not found");
        }
        holidayRepository.deleteById(id);
    }
}
