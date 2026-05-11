package com.collabsphere.project.controller;

import com.collabsphere.project.dto.AttachmentResponse;
import com.collabsphere.project.service.ProjectAttachmentService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/attachments")
@RequiredArgsConstructor
public class ProjectAttachmentController {

    private final ProjectAttachmentService attachmentService;

    // ─────────────────────────────────────────────────────────
    // UPLOAD ATTACHMENT
    // ─────────────────────────────────────────────────────────
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<AttachmentResponse> uploadAttachment(
            @PathVariable UUID projectId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {

        UUID userId = UUID.fromString(authentication.getName());

        AttachmentResponse response =
                attachmentService.uploadAttachment(
                        projectId,
                        userId,
                        file
                );

        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────
    // GET ALL ATTACHMENTS
    // ─────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<AttachmentResponse>> getAttachments(
            @PathVariable UUID projectId,
            Authentication authentication
    ) {

        UUID userId = UUID.fromString(authentication.getName());

        List<AttachmentResponse> attachments =
                attachmentService.getProjectAttachments(
                        projectId,
                        userId
                );

        return ResponseEntity.ok(attachments);
    }

    // ─────────────────────────────────────────────────────────
    // DELETE ATTACHMENT
    // ─────────────────────────────────────────────────────────
    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable UUID projectId,
            @PathVariable UUID attachmentId,
            Authentication authentication
    ) {

        UUID userId = UUID.fromString(authentication.getName());

        attachmentService.deleteAttachment(
                projectId,
                attachmentId,
                userId
        );

        return ResponseEntity.ok().build();
    }
}