package com.collabsphere.project.dto;

import com.collabsphere.project.entity.TaskStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BoardColumnDTO {

    private TaskStatus status;
    private List<TaskSummaryDTO> tasks;
}