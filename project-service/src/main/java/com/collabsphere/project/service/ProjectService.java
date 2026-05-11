package com.collabsphere.project.service;

import com.collabsphere.project.dto.AddMemberRequest;
import com.collabsphere.project.dto.CreateProjectRequest;
import com.collabsphere.project.dto.ProjectResponse;
import com.collabsphere.project.entity.Project;
import com.collabsphere.project.entity.ProjectMember;
import com.collabsphere.project.entity.ProjectRole;
import com.collabsphere.project.repository.ProjectMemberRepository;
import com.collabsphere.project.repository.ProjectRepository;
import com.collabsphere.project.websocket.WebSocketEventPublisher;
import com.collabsphere.project.notification.EmailService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;

    private final ProjectMemberRepository projectMemberRepository;

    private final WebSocketEventPublisher eventPublisher;

    private final EmailService emailService;

    // ─────────────────────────────────────────────────────────
    // CREATE PROJECT WORKSPACE
    // ─────────────────────────────────────────────────────────
    @Transactional
    public ProjectResponse createProject(
            CreateProjectRequest request,
            UUID userId
    ) {

        Project project = Project.builder()
                .title(request.getTitle())
                .shortDescription(request.getShortDescription())
                .detailedDescription(request.getDetailedDescription())
                .techStack(request.getTechStack())
                .requirements(request.getRequirements())
                .category(request.getCategory())
                .difficultyLevel(request.getDifficultyLevel())
                .expectedDuration(request.getExpectedDuration())
                .maxMembers(request.getMaxMembers())
                .recruitmentDeadline(request.getRecruitmentDeadline())
                .recruitingOpen(
                        request.getRecruitingOpen() != null
                                ? request.getRecruitingOpen()
                                : true
                )
                .status(
                        request.getStatus() != null
                                ? request.getStatus()
                                : com.collabsphere.project.entity.ProjectStatus.DRAFT
                )
                .createdBy(userId)
                .build();

        Project savedProject = projectRepository.save(project);

        // OWNER automatically becomes project member
        ProjectMember ownerMember = ProjectMember.builder()
                .projectId(savedProject.getId())
                .userId(userId)
                .role(ProjectRole.OWNER)
                .build();

        projectMemberRepository.save(ownerMember);

        return buildResponse(savedProject, ProjectRole.OWNER);
    }

    // ─────────────────────────────────────────────────────────
    // GET PROJECTS
    // ─────────────────────────────────────────────────────────
    public List<ProjectResponse> getProjects(
            Authentication authentication
    ) {

        boolean isAdmin = authentication.getAuthorities()
                .stream()
                .anyMatch(auth ->
                        auth.getAuthority().equals("ROLE_ADMIN"));

        UUID userId = UUID.fromString(authentication.getName());

        // ADMIN → can see all projects
        if (isAdmin) {

            return projectRepository.findAll()
                    .stream()
                    .filter(project ->
                            !Boolean.TRUE.equals(project.getArchived()))
                    .map(project -> {

                        ProjectRole role = projectMemberRepository
                                .findByProjectIdAndUserId(
                                        project.getId(),
                                        userId
                                )
                                .map(ProjectMember::getRole)
                                .orElse(ProjectRole.OWNER);

                        return buildResponse(project, role);

                    })
                    .toList();
        }

        // NORMAL USER → only member projects
        List<ProjectMember> memberships =
                projectMemberRepository.findByUserId(userId);

        List<UUID> projectIds = memberships
                .stream()
                .map(ProjectMember::getProjectId)
                .toList();

        return projectRepository.findAllById(projectIds)
                .stream()
                .filter(project ->
                        !Boolean.TRUE.equals(project.getArchived()))
                .map(project -> {

                    ProjectRole role = memberships
                            .stream()
                            .filter(member ->
                                    member.getProjectId()
                                            .equals(project.getId()))
                            .findFirst()
                            .orElseThrow(() ->
                                    new RuntimeException("Membership not found"))
                            .getRole();

                    return buildResponse(project, role);

                })
                .toList();
    }

    // ─────────────────────────────────────────────────────────
    // ARCHIVE PROJECT
    // ─────────────────────────────────────────────────────────
    @Transactional
    public void archiveProject(
            UUID projectId,
            UUID requesterId,
            boolean isAdmin
    ) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException("Project not found"));

        if (!isAdmin) {

            ProjectMember requester = projectMemberRepository
                    .findByProjectIdAndUserId(
                            projectId,
                            requesterId
                    )
                    .orElseThrow(() ->
                            new RuntimeException("Access denied"));

            if (requester.getRole() != ProjectRole.OWNER) {
                throw new RuntimeException(
                        "Only OWNER can archive project"
                );
            }
        }

        project.setArchived(true);
        project.setArchivedAt(Instant.now());
    }

    // ─────────────────────────────────────────────────────────
    // ADD MEMBER
    // ─────────────────────────────────────────────────────────
    @Transactional
    public void addMember(
            UUID projectId,
            UUID requesterId,
            boolean isAdmin,
            AddMemberRequest request
    ) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException("Project not found"));

        if (!isAdmin) {

            ProjectMember requester = projectMemberRepository
                    .findByProjectIdAndUserId(
                            projectId,
                            requesterId
                    )
                    .orElseThrow(() ->
                            new RuntimeException("Access denied"));

            if (requester.getRole() != ProjectRole.OWNER
                    && requester.getRole() != ProjectRole.TEAM_LEAD) {

                throw new RuntimeException(
                        "Only OWNER or TEAM_LEAD can add members"
                );
            }
        }

        boolean alreadyExists = projectMemberRepository
                .findByProjectIdAndUserId(
                        projectId,
                        request.getUserId()
                )
                .isPresent();

        if (alreadyExists) {
            throw new RuntimeException(
                    "User already a member"
            );
        }

        ProjectMember newMember = ProjectMember.builder()
                .projectId(projectId)
                .userId(request.getUserId())
                .role(request.getRole())
                .build();

        projectMemberRepository.save(newMember);

        // websocket event
        eventPublisher.memberAdded(
                projectId,
                requesterId.toString(),
                newMember
        );

        // temporary email placeholder
        emailService.sendMemberAdded(
                request.getUserId() + "@placeholder.com",
                request.getUserId().toString(),
                project.getTitle(),
                projectId,
                request.getRole().name(),
                requesterId.toString()
        );
    }

    // ─────────────────────────────────────────────────────────
    // CHANGE MEMBER ROLE
    // ─────────────────────────────────────────────────────────
    @Transactional
    public void changeMemberRole(
            UUID projectId,
            UUID requesterId,
            boolean isAdmin,
            UUID targetUserId,
            ProjectRole newRole
    ) {

        projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException("Project not found"));

        if (!isAdmin) {

            ProjectMember requester = projectMemberRepository
                    .findByProjectIdAndUserId(
                            projectId,
                            requesterId
                    )
                    .orElseThrow(() ->
                            new RuntimeException("Access denied"));

            if (requester.getRole() != ProjectRole.OWNER) {

                throw new RuntimeException(
                        "Only OWNER can change roles"
                );
            }
        }

        ProjectMember target = projectMemberRepository
                .findByProjectIdAndUserId(
                        projectId,
                        targetUserId
                )
                .orElseThrow(() ->
                        new RuntimeException("Target user not found"));

        // Ensure at least one OWNER remains
        if (target.getRole() == ProjectRole.OWNER
                && newRole != ProjectRole.OWNER) {

            long ownerCount =
                    projectMemberRepository.countByProjectIdAndRole(
                            projectId,
                            ProjectRole.OWNER
                    );

            if (ownerCount <= 1) {

                throw new RuntimeException(
                        "Project must contain at least one OWNER"
                );
            }
        }

        target.setRole(newRole);

        eventPublisher.memberRoleChanged(
                projectId,
                requesterId.toString(),
                target
        );
    }

    // ─────────────────────────────────────────────────────────
    // REMOVE MEMBER
    // ─────────────────────────────────────────────────────────
    @Transactional
    public void removeMember(
            UUID projectId,
            UUID requesterId,
            boolean isAdmin,
            UUID targetUserId
    ) {

        projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException("Project not found"));

        ProjectMember target = projectMemberRepository
                .findByProjectIdAndUserId(
                        projectId,
                        targetUserId
                )
                .orElseThrow(() ->
                        new RuntimeException("Target member not found"));

        if (!isAdmin) {

            ProjectMember requester = projectMemberRepository
                    .findByProjectIdAndUserId(
                            projectId,
                            requesterId
                    )
                    .orElseThrow(() ->
                            new RuntimeException("Access denied"));

            if (requester.getRole() != ProjectRole.OWNER) {

                throw new RuntimeException(
                        "Only OWNER can remove members"
                );
            }
        }

        // Prevent removing last OWNER
        if (target.getRole() == ProjectRole.OWNER) {

            long ownerCount =
                    projectMemberRepository.countByProjectIdAndRole(
                            projectId,
                            ProjectRole.OWNER
                    );

            if (ownerCount <= 1) {

                throw new RuntimeException(
                        "Project must contain at least one OWNER"
                );
            }
        }

        projectMemberRepository.delete(target);

        eventPublisher.memberRemoved(
                projectId,
                requesterId.toString(),
                targetUserId
        );
    }

    // ─────────────────────────────────────────────────────────
    // BUILD RESPONSE DTO
    // ─────────────────────────────────────────────────────────
    private ProjectResponse buildResponse(
            Project project,
            ProjectRole role
    ) {

        return ProjectResponse.builder()
                .id(project.getId())
                .createdBy(project.getCreatedBy())
                .createdAt(project.getCreatedAt())
                .myRole(role)

                .title(project.getTitle())
                .shortDescription(project.getShortDescription())
                .category(project.getCategory())
                .difficultyLevel(project.getDifficultyLevel())
                .expectedDuration(project.getExpectedDuration())
                .status(project.getStatus())
                .recruitingOpen(project.getRecruitingOpen())

                .build();
    }
}