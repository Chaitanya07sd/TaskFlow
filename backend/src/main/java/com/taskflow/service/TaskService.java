package com.taskflow.service;

import com.taskflow.dto.TaskRequest;
import com.taskflow.dto.TaskResponse;
import com.taskflow.dto.TaskStatsResponse;
import com.taskflow.entity.Task;
import com.taskflow.entity.TaskStatus;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.TaskRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserService userService;

    public TaskService(TaskRepository taskRepository, UserService userService) {
        this.taskRepository = taskRepository;
        this.userService = userService;
    }

    @Transactional
    public TaskResponse createTask(Long userId, TaskRequest request) {
        User user = userService.getUserEntityById(userId);

        TaskStatus status = request.getStatus() != null ? request.getStatus() : TaskStatus.PENDING;
        boolean recurring = request.getRecurringWeekly();
        Task task = new Task(
                request.getTitle().trim(),
                request.getDescription(),
                status,
                request.getDueDate(),
                recurring,
                request.getRecurrenceDay(),
                user
        );
        Task savedTask = taskRepository.save(task);

        return TaskResponse.fromEntity(savedTask);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasks(Long userId, TaskStatus status, String search, String sortBy, String sortDir) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        String sortProperty = "createdAt";
        if ("title".equalsIgnoreCase(sortBy)) {
            sortProperty = "title";
        } else if ("updatedAt".equalsIgnoreCase(sortBy)) {
            sortProperty = "updatedAt";
        }

        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Sort sort = Sort.by(direction, sortProperty);

        List<Task> tasks = taskRepository.searchTasks(userId, status, cleanSearch, sort);
        return tasks.stream()
                .map(TaskResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long taskId, Long userId) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
        return TaskResponse.fromEntity(task);
    }

    @Transactional
    public TaskResponse updateTask(Long taskId, Long userId, TaskRequest request) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        task.setTitle(request.getTitle().trim());
        task.setDescription(request.getDescription());
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }
        task.setDueDate(request.getDueDate());
        task.setRecurringWeekly(request.getRecurringWeekly());
        task.setRecurrenceDay(request.getRecurrenceDay());

        Task updatedTask = taskRepository.save(task);
        return TaskResponse.fromEntity(updatedTask);
    }

    @Transactional
    public TaskResponse updateTaskStatus(Long taskId, Long userId, TaskStatus newStatus) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        task.setStatus(newStatus);
        Task updatedTask = taskRepository.save(task);
        return TaskResponse.fromEntity(updatedTask);
    }

    @Transactional
    public void deleteTask(Long taskId, Long userId) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
        taskRepository.delete(task);
    }

    @Transactional(readOnly = true)
    public TaskStatsResponse getStats(Long userId) {
        long totalTasks = taskRepository.countByUserId(userId);
        long pendingTasks = taskRepository.countByUserIdAndStatus(userId, TaskStatus.PENDING);
        long completedTasks = taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED);

        double completionRate = 0.0;
        if (totalTasks > 0) {
            completionRate = Math.round(((double) completedTasks / totalTasks) * 1000.0) / 10.0;
        }

        return new TaskStatsResponse(totalTasks, pendingTasks, completedTasks, completionRate);
    }
}
