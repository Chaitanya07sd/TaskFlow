package com.taskflow.controller;

import com.taskflow.dto.ApiResponse;
import com.taskflow.dto.TimetableRequest;
import com.taskflow.dto.TimetableResponse;
import com.taskflow.entity.TimetableDay;
import com.taskflow.security.SecurityUtils;
import com.taskflow.service.TimetableService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/timetable")
public class TimetableController {

    private final TimetableService timetableService;

    public TimetableController(TimetableService timetableService) {
        this.timetableService = timetableService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TimetableResponse>>> getEntries(
            @RequestParam(required = false) TimetableDay day) {
        Long userId = SecurityUtils.getCurrentUserId();
        List<TimetableResponse> entries = (day != null)
                ? timetableService.getEntriesByDay(userId, day)
                : timetableService.getAllEntries(userId);
        return ResponseEntity.ok(ApiResponse.success("Timetable entries retrieved successfully", entries));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TimetableResponse>> createEntry(
            @Valid @RequestBody TimetableRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        TimetableResponse response = timetableService.createEntry(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Timetable entry created successfully", response));
    }

    @GetMapping("/check-overlap")
    public ResponseEntity<ApiResponse<List<TimetableResponse>>> checkOverlap(
            @RequestParam TimetableDay day,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") LocalTime startTime,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") LocalTime endTime,
            @RequestParam(required = false) Long excludeId) {
        Long userId = SecurityUtils.getCurrentUserId();
        List<TimetableResponse> overlaps = timetableService.findOverlappingEntries(userId, day, startTime, endTime, excludeId);
        return ResponseEntity.ok(ApiResponse.success("Overlap check complete", overlaps));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TimetableResponse>> getEntryById(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        TimetableResponse response = timetableService.getEntryById(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Timetable entry retrieved successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TimetableResponse>> updateEntry(
            @PathVariable Long id,
            @Valid @RequestBody TimetableRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        TimetableResponse response = timetableService.updateEntry(id, userId, request);
        return ResponseEntity.ok(ApiResponse.success("Timetable entry updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEntry(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        timetableService.deleteEntry(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Timetable entry deleted successfully"));
    }
}
