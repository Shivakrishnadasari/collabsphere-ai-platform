package com.collabsphere.project.dto;

import lombok.Data;

import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
public class CreateTaskRequest {
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must be less than 255 characters")
    private String title;
    @Size(max = 2000, message = "Description must be less than 2000 characters")
    private String description;
    private UUID assignedTo;
}