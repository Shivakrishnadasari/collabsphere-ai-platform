package com.collabsphere.project.service;

import com.collabsphere.project.entity.InvitationStatus;
import com.collabsphere.project.entity.Project;
import com.collabsphere.project.entity.ProjectInvitation;
import com.collabsphere.project.entity.ProjectMember;
import com.collabsphere.project.entity.ProjectRole;

import com.collabsphere.project.notification.EmailService;

import com.collabsphere.project.repository.ProjectInvitationRepository;
import com.collabsphere.project.repository.ProjectMemberRepository;
import com.collabsphere.project.repository.ProjectRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvitationService {

    private final ProjectRepository projectRepository;

    private final ProjectMemberRepository memberRepository;

    private final ProjectInvitationRepository invitationRepository;

    private final ProjectPermissionService permissions;

    private final EmailService emailService;

    @Value("${auth.service.url:http://localhost:8081}")
    private String authServiceUrl;

    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    // ─────────────────────────────────────────────────────────
    // SEND INVITATION
    // ─────────────────────────────────────────────────────────
    @Transactional
    public void inviteByEmail(
            UUID projectId,
            UUID requesterId,
            boolean isAdmin,
            String inviteeEmail,
            ProjectRole role
    ) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException("Project not found"));

        // OWNER or TEAM_LEAD only
        if (!isAdmin) {
            permissions.requireAtLeastTeamLead(
                    projectId,
                    requesterId
            );
        }

        // Prevent duplicate pending invite
        boolean pendingInviteExists =
                invitationRepository
                        .existsByProjectIdAndInviteeEmailAndStatus(
                                projectId,
                                inviteeEmail,
                                InvitationStatus.PENDING
                        );

        if (pendingInviteExists) {

            throw new RuntimeException(
                    "Pending invitation already exists"
            );
        }

        // Verify account exists in auth-service
        verifyUserExists(inviteeEmail);

        // Generate token
        String token = UUID.randomUUID().toString();

        ProjectInvitation invitation =
                ProjectInvitation.builder()
                        .projectId(projectId)
                        .invitedBy(requesterId)
                        .inviteeEmail(inviteeEmail)
                        .role(role)
                        .token(token)
                        .status(InvitationStatus.PENDING)
                        .createdAt(LocalDateTime.now())
                        .expiresAt(LocalDateTime.now().plusDays(7))
                        .build();

        invitationRepository.save(invitation);

        // Invitation acceptance link
        String invitationLink =
                frontendUrl
                        + "/invitations/accept?token="
                        + token;

        // Send email
        emailService.sendProjectInvitation(
                inviteeEmail,
                project.getTitle(),
                role.name(),
                invitationLink
        );

        log.info(
                "Invitation sent to {} for project {}",
                inviteeEmail,
                project.getTitle()
        );
    }

    // ─────────────────────────────────────────────────────────
    // ACCEPT INVITATION
    // ─────────────────────────────────────────────────────────
    @Transactional
    public void acceptInvitation(
            String token,
            UUID userId
    ) {

        ProjectInvitation invitation =
                invitationRepository.findByToken(token)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Invalid invitation token"
                                ));

        validateInvitation(invitation);

        // Prevent duplicate membership
        boolean alreadyMember =
                memberRepository
                        .findByProjectIdAndUserId(
                                invitation.getProjectId(),
                                userId
                        )
                        .isPresent();

        if (alreadyMember) {

            throw new RuntimeException(
                    "User is already a member"
            );
        }

        // Add member
        ProjectMember member = ProjectMember.builder()
                .projectId(invitation.getProjectId())
                .userId(userId)
                .role(invitation.getRole())
                .build();

        memberRepository.save(member);

        // Update invitation
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setRespondedAt(LocalDateTime.now());

        log.info(
                "Invitation accepted for project {}",
                invitation.getProjectId()
        );
    }

    // ─────────────────────────────────────────────────────────
    // REJECT INVITATION
    // ─────────────────────────────────────────────────────────
    @Transactional
    public void rejectInvitation(String token) {

        ProjectInvitation invitation =
                invitationRepository.findByToken(token)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Invalid invitation token"
                                ));

        validateInvitation(invitation);

        invitation.setStatus(InvitationStatus.REJECTED);
        invitation.setRespondedAt(LocalDateTime.now());

        log.info(
                "Invitation rejected for project {}",
                invitation.getProjectId()
        );
    }

    // ─────────────────────────────────────────────────────────
    // GET INVITATION DETAILS
    // ─────────────────────────────────────────────────────────
    public ProjectInvitation getInvitation(
            String token
    ) {

        ProjectInvitation invitation =
                invitationRepository.findByToken(token)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Invitation not found"
                                ));

        validateInvitation(invitation);

        return invitation;
    }

    // ─────────────────────────────────────────────────────────
    // VALIDATE INVITATION
    // ─────────────────────────────────────────────────────────
    private void validateInvitation(
            ProjectInvitation invitation
    ) {

        if (invitation.getStatus()
                != InvitationStatus.PENDING) {

            throw new RuntimeException(
                    "Invitation already processed"
            );
        }

        if (invitation.getExpiresAt()
                .isBefore(LocalDateTime.now())) {

            invitation.setStatus(InvitationStatus.EXPIRED);

            throw new RuntimeException(
                    "Invitation has expired"
            );
        }
    }

    // ─────────────────────────────────────────────────────────
    // VERIFY USER EXISTS
    // ─────────────────────────────────────────────────────────
    private void verifyUserExists(
            String email
    ) {

        try {

            WebClient authClient =
                    WebClient.create(authServiceUrl);

            Map<?, ?> userInfo = authClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/auth/users/by-email")
                            .queryParam("email", email)
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (userInfo == null
                    || !userInfo.containsKey("userId")) {

                throw new RuntimeException(
                        "No user account found for " + email
                );
            }

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to verify user account"
            );
        }
    }
}