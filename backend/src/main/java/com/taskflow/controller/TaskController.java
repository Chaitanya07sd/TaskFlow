package com.taskflow.controller;

import com.taskflow.dto.ApiResponse;
import com.taskflow.dto.TaskRequest;
import com.taskflow.dto.TaskResponse;
import com.taskflow.dto.TaskStatsResponse;
import com.taskflow.entity.TaskStatus;
import com.taskflow.security.SecurityUtils;
import com.taskflow.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasks(
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Long userId = SecurityUtils.getCurrentUserId();
        List<TaskResponse> tasks = taskService.getTasks(userId, status, search, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.success("Tasks fetched successfully", tasks));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(@Valid @RequestBody TaskRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        TaskResponse response = taskService.createTask(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Task created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> getTaskById(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        TaskResponse response = taskService.getTaskById(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Task fetched successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(@PathVariable Long id,
                                                               @Valid @RequestBody TaskRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        TaskResponse response = taskService.updateTask(id, userId, request);
        return ResponseEntity.ok(ApiResponse.success("Task updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTaskStatus(@PathVariable Long id,
                                                                     @RequestBody Map<String, String> payload) {
        Long userId = SecurityUtils.getCurrentUserId();
        String statusStr = payload.get("status");
        if (statusStr == null || statusStr.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Status is required"));
        }
        TaskStatus status;
        try {
            status = TaskStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid status value: " + statusStr));
        }

        TaskResponse response = taskService.updateTaskStatus(id, userId, status);
        return ResponseEntity.ok(ApiResponse.success("Task status updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        taskService.deleteTask(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Task deleted successfully"));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<TaskStatsResponse>> getStats() {
        Long userId = SecurityUtils.getCurrentUserId();
        TaskStatsResponse stats = taskService.getStats(userId);
        return ResponseEntity.ok(ApiResponse.success("Task statistics retrieved", stats));
    }
}
