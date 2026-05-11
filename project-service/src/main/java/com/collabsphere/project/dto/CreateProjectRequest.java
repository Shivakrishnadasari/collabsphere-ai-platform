package com.collabsphere.project.dto;

import com.collabsphere.project.entity.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CreateProjectRequest {

    @NotBlank(message = "Project title is required")
    private String title;

    private String shortDescription;

    private String detailedDescription;

    private String techStack;

    private String requirements;

    private String category;

    private String difficultyLevel;

    private String expectedDuration;

    private Integer maxMembers;

    private LocalDateTime recruitmentDeadline;

    private Boolean recruitingOpen = true;

    private ProjectStatus status = ProjectStatus.DRAFT;
}