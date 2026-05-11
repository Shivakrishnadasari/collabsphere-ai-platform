package com.collabsphere.project.repository;

import com.collabsphere.project.entity.ProjectMember;
import com.collabsphere.project.entity.ProjectRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {

    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);

    List<ProjectMember> findByUserId(UUID userId);

    // ── NEW: used by GET /api/projects/{id}/members ───────────
    List<ProjectMember> findByProjectId(UUID projectId);

    long countByProjectIdAndRole(UUID projectId, ProjectRole role);

    void deleteByProjectId(UUID projectId);
}