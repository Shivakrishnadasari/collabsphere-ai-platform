package com.collabsphere.project.repository;

import com.collabsphere.project.entity.ProjectAttachment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectAttachmentRepository
        extends JpaRepository<ProjectAttachment, UUID> {

    List<ProjectAttachment> findByProjectId(UUID projectId);
}