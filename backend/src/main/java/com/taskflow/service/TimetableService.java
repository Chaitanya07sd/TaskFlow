package com.taskflow.service;

import com.taskflow.dto.TimetableRequest;
import com.taskflow.dto.TimetableResponse;
import com.taskflow.entity.TimetableDay;
import com.taskflow.entity.TimetableEntry;
import com.taskflow.entity.User;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.TimetableRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final UserService userService;

    public TimetableService(TimetableRepository timetableRepository, UserService userService) {
        this.timetableRepository = timetableRepository;
        this.userService = userService;
    }

    private void validateTimeRange(TimetableRequest request) {
        if (request.getStartTime() == null || request.getEndTime() == null) {
            throw new BadRequestException("Start time and end time are required.");
        }
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BadRequestException("End time must be later than start time.");
        }
    }

    @Transactional
    public TimetableResponse createEntry(Long userId, TimetableRequest request) {
        validateTimeRange(request);

        User user = userService.getUserEntityById(userId);
        TimetableEntry entry = new TimetableEntry(
                request.getTitle().trim(),
                request.getDay(),
                request.getStartTime(),
                request.getEndTime(),
                request.getDescription() != null && !request.getDescription().trim().isEmpty()
                        ? request.getDescription().trim()
                        : null,
                user
        );

        TimetableEntry savedEntry = timetableRepository.save(entry);
        return TimetableResponse.fromEntity(savedEntry);
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> getEntriesByDay(Long userId, TimetableDay day) {
        List<TimetableEntry> entries = timetableRepository.findByUserIdAndDayOrderByStartTimeAsc(userId, day);
        return entries.stream()
                .map(TimetableResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> getAllEntries(Long userId) {
        List<TimetableEntry> entries = timetableRepository.findByUserIdOrderByDayAscStartTimeAsc(userId);
        return entries.stream()
                .map(TimetableResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TimetableResponse getEntryById(Long id, Long userId) {
        TimetableEntry entry = timetableRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable entry not found with id: " + id));
        return TimetableResponse.fromEntity(entry);
    }

    @Transactional(readOnly = true)
    public List<TimetableResponse> findOverlappingEntries(Long userId, TimetableDay day, LocalTime startTime, LocalTime endTime, Long excludeId) {
        if (day == null || startTime == null || endTime == null) {
            return Collections.emptyList();
        }
        List<TimetableEntry> dayEntries = timetableRepository.findByUserIdAndDayOrderByStartTimeAsc(userId, day);
        return dayEntries.stream()
                .filter(e -> excludeId == null || !e.getId().equals(excludeId))
                .filter(e -> e.getStartTime().isBefore(endTime) && startTime.isBefore(e.getEndTime()))
                .map(TimetableResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public TimetableResponse updateEntry(Long id, Long userId, TimetableRequest request) {
        validateTimeRange(request);

        TimetableEntry entry = timetableRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable entry not found with id: " + id));

        entry.setTitle(request.getTitle().trim());
        entry.setDay(request.getDay());
        entry.setStartTime(request.getStartTime());
        entry.setEndTime(request.getEndTime());
        entry.setDescription(request.getDescription() != null && !request.getDescription().trim().isEmpty()
                ? request.getDescription().trim()
                : null);

        TimetableEntry updatedEntry = timetableRepository.save(entry);
        return TimetableResponse.fromEntity(updatedEntry);
    }

    @Transactional
    public void deleteEntry(Long id, Long userId) {
        TimetableEntry entry = timetableRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable entry not found with id: " + id));
        timetableRepository.delete(entry);
    }
}
