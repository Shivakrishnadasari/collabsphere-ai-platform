package com.collabsphere.project.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WebSocketEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast any event to all subscribers of /topic/project/{projectId}
     */
    public void publish(ProjectEvent.Type type,
                        UUID projectId,
                        String triggeredBy,
                        Object payload) {

        ProjectEvent event = ProjectEvent.builder()
                .type(type)
                .projectId(projectId)
                .triggeredBy(triggeredBy)
                .payload(payload)
                .timestamp(Instant.now())
                .build();

        messagingTemplate.convertAndSend(
                "/topic/project/" + projectId,
                event
        );
    }

    // ── Convenience methods ───────────────────────────────────

    public void taskCreated(UUID projectId, String userId, Object task) {
        publish(ProjectEvent.Type.TASK_CREATED, projectId, userId, task);
    }

    public void taskUpdated(UUID projectId, String userId, Object task) {
        publish(ProjectEvent.Type.TASK_UPDATED, projectId, userId, task);
    }

    public void taskDeleted(UUID projectId, String userId, UUID taskId) {
        publish(ProjectEvent.Type.TASK_DELETED, projectId, userId, taskId);
    }

    public void taskMoved(UUID projectId, String userId, Object task) {
        publish(ProjectEvent.Type.TASK_MOVED, projectId, userId, task);
    }

    public void memberAdded(UUID projectId, String userId, Object member) {
        publish(ProjectEvent.Type.MEMBER_ADDED, projectId, userId, member);
    }

    public void memberRemoved(UUID projectId, String userId, UUID removedUserId) {
        publish(ProjectEvent.Type.MEMBER_REMOVED, projectId, userId, removedUserId);
    }

    public void memberRoleChanged(UUID projectId, String userId, Object member) {
        publish(ProjectEvent.Type.MEMBER_ROLE_CHANGED, projectId, userId, member);
    }
}