package com.collabsphere.project.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class BoardResponseDTO {

    private UUID projectId;
    private List<BoardColumnDTO> columns;
}