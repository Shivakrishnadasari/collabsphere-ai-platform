package com.collabsphere.project.ai.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AITaskSuggestion {

    private String title;

    private String description;

    private String priority;

    private String suggestedRole;

    private Integer estimatedHours;
}