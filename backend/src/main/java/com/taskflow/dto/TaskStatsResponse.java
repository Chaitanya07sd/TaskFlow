package com.taskflow.dto;

public class TaskStatsResponse {

    private long totalTasks;
    private long pendingTasks;
    private long completedTasks;
    private double completionRate;

    public TaskStatsResponse() {
    }

    public TaskStatsResponse(long totalTasks, long pendingTasks, long completedTasks, double completionRate) {
        this.totalTasks = totalTasks;
        this.pendingTasks = pendingTasks;
        this.completedTasks = completedTasks;
        this.completionRate = completionRate;
    }

    public long getTotalTasks() {
        return totalTasks;
    }

    public void setTotalTasks(long totalTasks) {
        this.totalTasks = totalTasks;
    }

    public long getPendingTasks() {
        return pendingTasks;
    }

    public void setPendingTasks(long pendingTasks) {
        this.pendingTasks = pendingTasks;
    }

    public long getCompletedTasks() {
        return completedTasks;
    }

    public void setCompletedTasks(long completedTasks) {
        this.completedTasks = completedTasks;
    }

    public double getCompletionRate() {
        return completionRate;
    }

    public void setCompletionRate(double completionRate) {
        this.completionRate = completionRate;
    }
}
