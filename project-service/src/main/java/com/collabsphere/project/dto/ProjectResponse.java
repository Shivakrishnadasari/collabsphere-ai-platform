package com.collabsphere.project.dto;

import com.collabsphere.project.entity.ProjectRole;
import com.collabsphere.project.entity.ProjectStatus;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class ProjectResponse {

    private UUID id;

    private UUID createdBy;
    private LocalDateTime createdAt;
    private ProjectRole myRole;
    private String title;

private String shortDescription;

private String category;

private String difficultyLevel;

private String expectedDuration;

private ProjectStatus status;

private Boolean recruitingOpen;

}