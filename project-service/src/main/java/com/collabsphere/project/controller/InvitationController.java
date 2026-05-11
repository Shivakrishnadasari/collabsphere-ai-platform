package com.collabsphere.project.controller;

import com.collabsphere.project.entity.ProjectInvitation;

import com.collabsphere.project.service.InvitationService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    // ─────────────────────────────────────────────────────────
    // GET INVITATION DETAILS
    // ─────────────────────────────────────────────────────────
    @GetMapping("/{token}")
    public ResponseEntity<?> getInvitation(
            @PathVariable String token
    ) {

        ProjectInvitation invitation =
                invitationService.getInvitation(token);

        return ResponseEntity.ok(
                Map.of(
                        "projectId", invitation.getProjectId(),
                        "inviteeEmail", invitation.getInviteeEmail(),
                        "role", invitation.getRole(),
                        "status", invitation.getStatus(),
                        "expiresAt", invitation.getExpiresAt()
                )
        );
    }

    // ─────────────────────────────────────────────────────────
    // ACCEPT INVITATION
    // ─────────────────────────────────────────────────────────
    @PostMapping("/{token}/accept")
    public ResponseEntity<?> acceptInvitation(
            @PathVariable String token,
            Authentication authentication
    ) {

        UUID userId =
                UUID.fromString(authentication.getName());

        invitationService.acceptInvitation(
                token,
                userId
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Invitation accepted successfully"
                )
        );
    }

    // ─────────────────────────────────────────────────────────
    // REJECT INVITATION
    // ─────────────────────────────────────────────────────────
    @PostMapping("/{token}/reject")
    public ResponseEntity<?> rejectInvitation(
            @PathVariable String token
    ) {

        invitationService.rejectInvitation(token);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Invitation rejected"
                )
        );
    }
}