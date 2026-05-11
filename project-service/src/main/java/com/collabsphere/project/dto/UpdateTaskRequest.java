package com.collabsphere.project.dto;

import com.collabsphere.project.entity.TaskStatus;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateTaskRequest {

    private String title;
    private String description;
    private TaskStatus status;
    private UUID assignedTo;
    private Long version;

}