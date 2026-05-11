package com.collabsphere.project.dto;

import com.collabsphere.project.entity.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MoveTaskRequest {

    @NotNull(message = "New status is required")
    private TaskStatus newStatus;

    @NotNull(message = "New position is required")
    private Long newPosition;

    @NotNull(message = "Version is required")
    private Long version;
}