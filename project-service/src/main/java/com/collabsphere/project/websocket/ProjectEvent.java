package com.collabsphere.project.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectEvent {

    public enum Type {
        TASK_CREATED,
        TASK_UPDATED,
        TASK_DELETED,
        TASK_MOVED,
        MEMBER_ADDED,
        MEMBER_REMOVED,
        MEMBER_ROLE_CHANGED
    }

    private Type type;
    private UUID projectId;
    private String triggeredBy;  // userId who caused the event
    private Object payload;      // task or member data
    private Instant timestamp;
}