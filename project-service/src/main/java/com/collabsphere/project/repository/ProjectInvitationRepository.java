package com.collabsphere.project.repository;

import com.collabsphere.project.entity.ProjectInvitation;
import com.collabsphere.project.entity.InvitationStatus;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProjectInvitationRepository
        extends JpaRepository<ProjectInvitation, UUID> {

    Optional<ProjectInvitation> findByToken(String token);

    boolean existsByProjectIdAndInviteeEmailAndStatus(
            UUID projectId,
            String inviteeEmail,
            InvitationStatus status
    );
}