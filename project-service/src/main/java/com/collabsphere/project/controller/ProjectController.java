package com.collabsphere.project.controller;

import com.collabsphere.project.dto.AddMemberRequest;
import com.collabsphere.project.dto.ChangeRoleRequest;
import com.collabsphere.project.dto.CreateProjectRequest;
import com.collabsphere.project.dto.ProjectResponse;
import com.collabsphere.project.entity.ProjectRole;
import com.collabsphere.project.repository.ProjectMemberRepository;
import com.collabsphere.project.service.InvitationService;
import com.collabsphere.project.service.ProjectPermissionService;
import com.collabsphere.project.service.ProjectService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    private final InvitationService invitationService;

    private final ProjectMemberRepository memberRepository;

    private final ProjectPermissionService permissions;

    // ─────────────────────────────────────────────────────────
    // CREATE PROJECT WORKSPACE
    // ─────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            Authentication authentication
    ) {

        UUID userId = uuid(authentication);

        ProjectResponse response =
                projectService.createProject(request, userId);

        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────
    // GET ALL PROJECTS
    // ─────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getProjects(
            Authentication authentication
    ) {

        List<ProjectResponse> projects =
                projectService.getProjects(authentication);

        return ResponseEntity.ok(projects);
    }

    // ─────────────────────────────────────────────────────────
    // GET PROJECT MEMBERS
    // ─────────────────────────────────────────────────────────
    @GetMapping("/{projectId}/members")
    public ResponseEntity<List<MemberResponse>> getMembers(
            @PathVariable UUID projectId,
            Authentication authentication
    ) {

        UUID userId = uuid(authentication);

        // Must be a member of project
        permissions.getRole(projectId, userId);

        List<MemberResponse> members = memberRepository
                .findByProjectId(projectId)
                .stream()
                .map(member -> new MemberResponse(
                        member.getUserId(),
                        member.getRole()
                ))
                .toList();

        return ResponseEntity.ok(members);
    }

    // ─────────────────────────────────────────────────────────
    // ARCHIVE PROJECT
    // ─────────────────────────────────────────────────────────
    @PostMapping("/{projectId}/archive")
    public ResponseEntity<Void> archiveProject(
            @PathVariable UUID projectId,
            Authentication authentication
    ) {

        projectService.archiveProject(
                projectId,
                uuid(authentication),
                isAdmin(authentication)
        );

        return ResponseEntity.ok().build();
    }

    // ─────────────────────────────────────────────────────────
    // INVITE MEMBER BY EMAIL
    // ─────────────────────────────────────────────────────────
    @PostMapping("/{projectId}/invitations")
    public ResponseEntity<?> inviteByEmail(
            @PathVariable UUID projectId,
            @RequestBody Map<String, String> body,
            Authentication authentication
    ) {

        String email = body.get("email");

        String roleStr =
                body.getOrDefault("role", "MEMBER");

        try {

            invitationService.inviteByEmail(
                    projectId,
                    uuid(authentication),
                    isAdmin(authentication),
                    email,
                    ProjectRole.valueOf(roleStr.toUpperCase())
            );

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Invitation sent successfully to " + email
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "error",
                                    e.getMessage()
                            )
                    );
        }
    }

    // ─────────────────────────────────────────────────────────
    // ADD MEMBER DIRECTLY
    // ─────────────────────────────────────────────────────────
    @PostMapping("/{projectId}/members")
    public ResponseEntity<Void> addMember(
            @PathVariable UUID projectId,
            @RequestBody AddMemberRequest request,
            Authentication authentication
    ) {

        projectService.addMember(
                projectId,
                uuid(authentication),
                isAdmin(authentication),
                request
        );

        return ResponseEntity.ok().build();
    }

    // ─────────────────────────────────────────────────────────
    // CHANGE MEMBER ROLE
    // ─────────────────────────────────────────────────────────
    @PatchMapping("/{projectId}/members/{userId}/role")
    public ResponseEntity<Void> changeRole(
            @PathVariable UUID projectId,
            @PathVariable UUID userId,
            @RequestBody ChangeRoleRequest request,
            Authentication authentication
    ) {

        projectService.changeMemberRole(
                projectId,
                uuid(authentication),
                isAdmin(authentication),
                userId,
                request.getRole()
        );

        return ResponseEntity.ok().build();
    }

    // ─────────────────────────────────────────────────────────
    // REMOVE MEMBER
    // ─────────────────────────────────────────────────────────
    @DeleteMapping("/{projectId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID projectId,
            @PathVariable UUID userId,
            Authentication authentication
    ) {

        projectService.removeMember(
                projectId,
                uuid(authentication),
                isAdmin(authentication),
                userId
        );

        return ResponseEntity.ok().build();
    }

    // ─────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────
    private UUID uuid(Authentication authentication) {

        return UUID.fromString(authentication.getName());
    }

    private boolean isAdmin(Authentication authentication) {

        return authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        authority.getAuthority()
                                .equals("ROLE_ADMIN"));
    }

    // ─────────────────────────────────────────────────────────
    // MEMBER RESPONSE RECORD
    // ─────────────────────────────────────────────────────────
    public record MemberResponse(
            UUID userId,
            ProjectRole role
    ) {
    }
}