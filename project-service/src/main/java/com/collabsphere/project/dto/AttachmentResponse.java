package com.collabsphere.project.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class AttachmentResponse {

    private UUID id;

    private String fileName;

    private String originalFileName;

    private String fileUrl;

    private String fileType;

    private Long fileSize;

    private LocalDateTime uploadedAt;
}