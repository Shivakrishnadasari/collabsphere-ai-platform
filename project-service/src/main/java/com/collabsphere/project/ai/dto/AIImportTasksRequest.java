package com.collabsphere.project.ai.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIImportTasksRequest {

    private List<AITaskSuggestion> tasks;
}