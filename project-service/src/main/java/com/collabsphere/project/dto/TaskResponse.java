package com.collabsphere.project.dto;

import com.collabsphere.project.entity.TaskStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class TaskResponse {

    private UUID id;
    private String title;
    private String description;
    private TaskStatus status;
    private UUID assignedTo;
    private UUID createdBy;
    private Instant createdAt;
    private Long version;
}