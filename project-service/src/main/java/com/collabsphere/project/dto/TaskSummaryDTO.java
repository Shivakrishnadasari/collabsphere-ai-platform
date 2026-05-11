package com.collabsphere.project.dto;

import com.collabsphere.project.entity.TaskStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TaskSummaryDTO {

    private UUID id;
    private String title;
    private TaskStatus status;
    private UUID assignedTo;
    private LocalDateTime createdAt;
}