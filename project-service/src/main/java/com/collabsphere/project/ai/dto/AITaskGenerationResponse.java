package com.collabsphere.project.ai.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AITaskGenerationResponse {

    private String projectSummary;

    private List<String> suggestedMilestones;

    private List<AITaskSuggestion> tasks;
}