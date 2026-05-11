package com.collabsphere.project.service;

import com.collabsphere.project.dto.AttachmentResponse;
import com.collabsphere.project.entity.Project;
import com.collabsphere.project.entity.ProjectAttachment;
import com.collabsphere.project.entity.ProjectMember;
import com.collabsphere.project.entity.ProjectRole;
import com.collabsphere.project.repository.ProjectAttachmentRepository;
import com.collabsphere.project.repository.ProjectMemberRepository;
import com.collabsphere.project.repository.ProjectRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import java.time.LocalDateTime;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectAttachmentService {

    private final ProjectAttachmentRepository attachmentRepository;

    private final ProjectRepository projectRepository;

    private final ProjectMemberRepository memberRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    // ─────────────────────────────────────────────────────────
    // ALLOWED FILE TYPES
    // ─────────────────────────────────────────────────────────
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf",
            "doc",
            "docx",
            "ppt",
            "pptx",
            "png",
            "jpg",
            "jpeg",
            "zip",
            "txt"
    );

    // ─────────────────────────────────────────────────────────
    // UPLOAD ATTACHMENT
    // ─────────────────────────────────────────────────────────
    @Transactional
    public AttachmentResponse uploadAttachment(
            UUID projectId,
            UUID userId,
            MultipartFile file
    ) {

        // Validate project exists
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException("Project not found"));

        // Validate permissions
        ProjectMember member = memberRepository
                .findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() ->
                        new RuntimeException("Access denied"));

        if (member.getRole() != ProjectRole.OWNER
                && member.getRole() != ProjectRole.TEAM_LEAD) {

            throw new RuntimeException(
                    "Only OWNER or TEAM_LEAD can upload attachments"
            );
        }

        // Validate file exists
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        String originalFileName = file.getOriginalFilename();

        if (originalFileName == null
                || originalFileName.isBlank()) {

            throw new RuntimeException("Invalid file name");
        }

        // Validate extension
        String extension = getExtension(originalFileName);

        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {

            throw new RuntimeException(
                    "Unsupported file type: " + extension
            );
        }

        try {

            // Create project upload folder
            Path projectUploadPath = Paths.get(
                    uploadDir,
                    projectId.toString()
            );

            Files.createDirectories(projectUploadPath);

            // Generate secure unique file name
            String storedFileName =
                    UUID.randomUUID() + "_" + originalFileName;

            Path targetLocation =
                    projectUploadPath.resolve(storedFileName);

            // Save file
            Files.copy(
                    file.getInputStream(),
                    targetLocation,
                    StandardCopyOption.REPLACE_EXISTING
            );

            // Build file URL
            String fileUrl =
                    "/uploads/projects/"
                            + projectId
                            + "/"
                            + storedFileName;

            // Save metadata
            ProjectAttachment attachment =
                    ProjectAttachment.builder()
                            .projectId(projectId)
                            .fileName(storedFileName)
                            .originalFileName(originalFileName)
                            .fileUrl(fileUrl)
                            .fileType(file.getContentType())
                            .fileSize(file.getSize())
                            .uploadedBy(userId)
                            .uploadedAt(LocalDateTime.now())
                            .build();

            ProjectAttachment saved =
                    attachmentRepository.save(attachment);

            return mapToResponse(saved);

        } catch (IOException e) {

            throw new RuntimeException(
                    "Failed to upload file",
                    e
            );
        }
    }

    // ─────────────────────────────────────────────────────────
    // GET PROJECT ATTACHMENTS
    // ─────────────────────────────────────────────────────────
    public List<AttachmentResponse> getProjectAttachments(
            UUID projectId,
            UUID userId
    ) {

        // Validate membership
        memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() ->
                        new RuntimeException("Access denied"));

        return attachmentRepository.findByProjectId(projectId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // ─────────────────────────────────────────────────────────
    // DELETE ATTACHMENT
    // ─────────────────────────────────────────────────────────
    @Transactional
    public void deleteAttachment(
            UUID projectId,
            UUID attachmentId,
            UUID userId
    ) {

        ProjectMember member = memberRepository
                .findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() ->
                        new RuntimeException("Access denied"));

        if (member.getRole() != ProjectRole.OWNER
                && member.getRole() != ProjectRole.TEAM_LEAD) {

            throw new RuntimeException(
                    "Only OWNER or TEAM_LEAD can delete attachments"
            );
        }

        ProjectAttachment attachment =
                attachmentRepository.findById(attachmentId)
                        .orElseThrow(() ->
                                new RuntimeException("Attachment not found"));

        try {

            Path filePath = Paths.get(
                    uploadDir,
                    projectId.toString(),
                    attachment.getFileName()
            );

            Files.deleteIfExists(filePath);

            attachmentRepository.delete(attachment);

        } catch (IOException e) {

            throw new RuntimeException(
                    "Failed to delete attachment",
                    e
            );
        }
    }

    // ─────────────────────────────────────────────────────────
    // HELPER → MAP RESPONSE
    // ─────────────────────────────────────────────────────────
    private AttachmentResponse mapToResponse(
            ProjectAttachment attachment
    ) {

        return AttachmentResponse.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .originalFileName(attachment.getOriginalFileName())
                .fileUrl(attachment.getFileUrl())
                .fileType(attachment.getFileType())
                .fileSize(attachment.getFileSize())
                .uploadedAt(attachment.getUploadedAt())
                .build();
    }

    // ─────────────────────────────────────────────────────────
    // HELPER → GET EXTENSION
    // ─────────────────────────────────────────────────────────
    private String getExtension(String fileName) {

        int lastDotIndex = fileName.lastIndexOf(".");

        if (lastDotIndex == -1) {
            return "";
        }

        return fileName.substring(lastDotIndex + 1);
    }
}