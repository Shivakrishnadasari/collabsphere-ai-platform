package com.collabsphere.project.service;

import com.collabsphere.project.entity.ProjectMember;
import com.collabsphere.project.entity.ProjectRole;
import com.collabsphere.project.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Single source of truth for project-level permission checks.
 *
 * Rule table:
 *  OWNER     → can do everything
 *  TEAM_LEAD → can create, update, move tasks; cannot delete project or remove OWNER
 *  MEMBER    → can create and update own tasks; can move any task
 *  VIEWER    → read-only — no writes at all
 */
@Service
@RequiredArgsConstructor
public class ProjectPermissionService {

    private final ProjectMemberRepository memberRepository;

    // ── Fetch role, throws if not a member ────────────────────
    public ProjectRole getRole(UUID projectId, UUID userId) {
        return memberRepository.findByProjectIdAndUserId(projectId, userId)
                .map(ProjectMember::getRole)
                .orElseThrow(() -> new SecurityException(
                        "You are not a member of this project"));
    }

    // ── Guards ─────────────────────────────────────────────────

    /** VIEWER cannot write anything */
    public void requireAtLeastMember(UUID projectId, UUID userId) {
        ProjectRole role = getRole(projectId, userId);
        if (role == ProjectRole.VIEWER) {
            throw new SecurityException("Viewers have read-only access");
        }
    }

    /** Only OWNER or TEAM_LEAD can delete tasks */
    public void requireAtLeastTeamLead(UUID projectId, UUID userId) {
        ProjectRole role = getRole(projectId, userId);
        if (role == ProjectRole.VIEWER || role == ProjectRole.MEMBER) {
            throw new SecurityException(
                    "Only Owner or Team Lead can perform this action");
        }
    }

    /** Only OWNER can archive project, remove members, change roles */
    public void requireOwner(UUID projectId, UUID userId) {
        ProjectRole role = getRole(projectId, userId);
        if (role != ProjectRole.OWNER) {
            throw new SecurityException("Only the project Owner can perform this action");
        }
    }

    /** MEMBER can only edit their own tasks; TEAM_LEAD/OWNER can edit any */
    public void requireCanEditTask(UUID projectId, UUID userId, UUID taskOwnerId) {
        ProjectRole role = getRole(projectId, userId);
        if (role == ProjectRole.VIEWER) {
            throw new SecurityException("Viewers have read-only access");
        }
        if (role == ProjectRole.MEMBER && !userId.equals(taskOwnerId)) {
            throw new SecurityException(
                    "Members can only edit tasks they created");
        }
        // TEAM_LEAD and OWNER can edit any task — no restriction
    }
}