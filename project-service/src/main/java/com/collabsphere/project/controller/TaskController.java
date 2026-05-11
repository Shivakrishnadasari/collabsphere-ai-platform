package com.collabsphere.project.controller;

import com.collabsphere.project.dto.*;
import com.collabsphere.project.entity.Task;
import com.collabsphere.project.entity.TaskStatus;
import com.collabsphere.project.service.ProjectPermissionService;
import com.collabsphere.project.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final ProjectPermissionService permissions;   // ← injected

    // ── CREATE ────────────────────────────────────────────────
    @PostMapping
    public Task createTask(@PathVariable UUID projectId,
                           @Valid @RequestBody CreateTaskRequest request,
                           Authentication authentication) {

        UUID userId = uuid(authentication);
        permissions.requireAtLeastMember(projectId, userId);   // VIEWER blocked

        return taskService.createTask(
                projectId,
                request.getTitle(),
                request.getDescription(),
                request.getAssignedTo(),
                userId
        );
    }

    // ── READ (board + list) — any member including VIEWER ────
    @GetMapping
    public Page<TaskResponse> getProjectTasks(
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) TaskStatus status,
            Authentication authentication) {

        UUID userId = uuid(authentication);
        permissions.getRole(projectId, userId);                // must be a member

        return taskService.getProjectTasks(
                projectId, userId, page, size, sortBy, direction, status);
    }

    @GetMapping("/board")
    public ResponseEntity<BoardResponseDTO> getBoard(
            @PathVariable UUID projectId,
            Authentication authentication) {

        UUID userId = uuid(authentication);
        permissions.getRole(projectId, userId);                // must be a member

        return ResponseEntity.ok(taskService.getProjectBoard(projectId, userId));
    }

    // ── UPDATE ────────────────────────────────────────────────
    @PutMapping("/{taskId}")
    public Task updateTask(@PathVariable UUID projectId,
                           @PathVariable UUID taskId,
                           @Valid @RequestBody UpdateTaskRequest request,
                           Authentication authentication) {

        UUID userId = uuid(authentication);

        // Fetch the task's creator so MEMBER restriction can be checked
        UUID taskCreatedBy = taskService.getTaskCreatedBy(projectId, taskId);
        permissions.requireCanEditTask(projectId, userId, taskCreatedBy);

        return taskService.updateTask(
                projectId, taskId,
                request.getTitle(), request.getDescription(),
                request.getStatus(), request.getAssignedTo(),
                request.getVersion(), userId
        );
    }

    // ── DELETE — OWNER or TEAM_LEAD only ─────────────────────
    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID projectId,
                                            @PathVariable UUID taskId,
                                            Authentication authentication) {

        UUID userId = uuid(authentication);
        permissions.requireAtLeastTeamLead(projectId, userId);  // MEMBER blocked

        taskService.deleteTask(projectId, taskId, userId);
        return ResponseEntity.ok().build();
    }

    // ── MOVE — any member except VIEWER ──────────────────────
    @PatchMapping("/{taskId}/move")
    public TaskResponse moveTask(@PathVariable UUID projectId,
                                  @PathVariable UUID taskId,
                                  @Valid @RequestBody MoveTaskRequest request,
                                  Authentication authentication) {

        UUID userId = uuid(authentication);
        permissions.requireAtLeastMember(projectId, userId);    // VIEWER blocked

        return taskService.moveTask(
                projectId, taskId, userId,
                request.getNewStatus(), request.getNewPosition(),
                request.getVersion()
        );
    }

    // ── Helper ────────────────────────────────────────────────
    private UUID uuid(Authentication auth) {
        return UUID.fromString(auth.getName());
    }
}