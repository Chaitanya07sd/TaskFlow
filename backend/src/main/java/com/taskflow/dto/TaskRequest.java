package com.taskflow.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.taskflow.entity.TaskStatus;
import com.taskflow.entity.TimetableDay;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class TaskRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    private String description;

    private TaskStatus status;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dueDate;

    private Boolean recurringWeekly = false;

    private TimetableDay recurrenceDay;

    public TaskRequest() {
    }

    public TaskRequest(String title, String description, TaskStatus status) {
        this.title = title;
        this.description = description;
        this.status = status;
        this.recurringWeekly = false;
    }

    public TaskRequest(String title, String description, TaskStatus status, LocalDate dueDate, Boolean recurringWeekly, TimetableDay recurrenceDay) {
        this.title = title;
        this.description = description;
        this.status = status;
        this.dueDate = dueDate;
        this.recurringWeekly = recurringWeekly != null ? recurringWeekly : false;
        this.recurrenceDay = recurrenceDay;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public Boolean getRecurringWeekly() {
        return recurringWeekly != null ? recurringWeekly : false;
    }

    public void setRecurringWeekly(Boolean recurringWeekly) {
        this.recurringWeekly = recurringWeekly;
    }

    public TimetableDay getRecurrenceDay() {
        return recurrenceDay;
    }

    public void setRecurrenceDay(TimetableDay recurrenceDay) {
        this.recurrenceDay = recurrenceDay;
    }
}
