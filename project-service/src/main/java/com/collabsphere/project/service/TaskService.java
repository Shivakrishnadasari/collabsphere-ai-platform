package com.collabsphere.project.service;

import com.collabsphere.project.dto.*;
import com.collabsphere.project.entity.*;
import com.collabsphere.project.exception.*;
import com.collabsphere.project.repository.TaskRepository;
import com.collabsphere.project.repository.ProjectMemberRepository;
import com.collabsphere.project.websocket.WebSocketEventPublisher;
import com.collabsphere.project.notification.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final WebSocketEventPublisher eventPublisher;
    private final EmailService emailService;

    private static final List<String> ALLOWED_SORT_FIELDS = Arrays.asList(
            "createdAt", "title", "status", "position"
    );

    /*
     * CREATE TASK
     */
    @Transactional
    public Task createTask(UUID projectId,
                           String title,
                           String description,
                           UUID assignedTo,
                           UUID currentUserId) {

        ProjectMember member = getValidatedMember(projectId, currentUserId);

        if (member.getRole() == ProjectRole.VIEWER) {
            throw new UnauthorizedException("VIEWER cannot create tasks");
        }

        if (assignedTo != null) {
            validateAssignment(projectId, assignedTo);
        }

        TaskStatus initialStatus = TaskStatus.TODO;

        Long maxPosition = taskRepository
                .findMaxPosition(projectId, initialStatus)
                .orElse(0L);

        Task task = new Task();
        task.setProjectId(projectId);
        task.setTitle(title);
        task.setDescription(description);
        task.setAssignedTo(assignedTo);
        task.setCreatedBy(currentUserId);
        task.setStatus(initialStatus);
        task.setPosition(maxPosition + 1000);

        Task saved = taskRepository.save(task);

        // ── Broadcast live update ──────────────────────────────
        eventPublisher.taskCreated(projectId, currentUserId.toString(), mapToResponse(saved));

        // ── Email assignee if someone else was assigned ────────
        if (assignedTo != null && !assignedTo.equals(currentUserId)) {
            emailService.sendTaskAssigned(
                    assignedTo + "@placeholder.com", // replace with real email lookup
                    assignedTo.toString(),
                    title,
                    description,
                    projectId.toString(),
                    projectId,
                    currentUserId.toString()
            );
        }

        return saved;
    }

    /*
     * GET PROJECT TASKS (Paginated)
     */
    public Page<TaskResponse> getProjectTasks(UUID projectId,
                                              UUID currentUserId,
                                              int page,
                                              int size,
                                              String sortBy,
                                              String direction,
                                              TaskStatus status) {

        getValidatedMember(projectId, currentUserId);

        if (page < 0) throw new BadRequestException("Page cannot be negative");
        if (size <= 0 || size > 100)
            throw new BadRequestException("Size must be between 1 and 100");

        if (sortBy == null || !ALLOWED_SORT_FIELDS.contains(sortBy)) {
            sortBy = "createdAt";
        }

        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Task> taskPage = status != null
                ? taskRepository.findByProjectIdAndStatus(projectId, status, pageable)
                : taskRepository.findByProjectId(projectId, pageable);

        return taskPage.map(this::mapToResponse);
    }

    /*
     * UPDATE TASK
     */
    @Transactional
    public Task updateTask(UUID projectId,
                           UUID taskId,
                           String title,
                           String description,
                           TaskStatus status,
                           UUID assignedTo,
                           Long version,
                           UUID currentUserId) {

        Task task = taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        ProjectMember member = getValidatedMember(projectId, currentUserId);

        boolean isOwner   = member.getRole() == ProjectRole.OWNER;
        boolean isCreator = task.getCreatedBy().equals(currentUserId);

        if (!isOwner && !isCreator) {
            throw new UnauthorizedException("Not authorized to update task");
        }

        if (!task.getVersion().equals(version)) {
            throw new BadRequestException("Task was modified by another user. Please refresh.");
        }

        UUID prevAssignee = task.getAssignedTo();

        if (assignedTo != null) {
            validateAssignment(projectId, assignedTo);
            task.setAssignedTo(assignedTo);
        }
        if (title != null)       task.setTitle(title);
        if (description != null) task.setDescription(description);
        if (status != null)      task.setStatus(status);

        Task saved = taskRepository.save(task);

        // ── Broadcast live update ──────────────────────────────
        eventPublisher.taskUpdated(projectId, currentUserId.toString(), mapToResponse(saved));

        // ── Email new assignee if changed ──────────────────────
        if (assignedTo != null
                && !assignedTo.equals(currentUserId)
                && !assignedTo.equals(prevAssignee)) {
            emailService.sendTaskAssigned(
                    assignedTo + "@placeholder.com",
                    assignedTo.toString(),
                    saved.getTitle(),
                    saved.getDescription(),
                    projectId.toString(),
                    projectId,
                    currentUserId.toString()
            );
        }

        return saved;
    }

    /*
     * DELETE TASK
     */
    @Transactional
    public void deleteTask(UUID projectId, UUID taskId, UUID currentUserId) {

        ProjectMember member = getValidatedMember(projectId, currentUserId);

        if (member.getRole() != ProjectRole.OWNER) {
            throw new UnauthorizedException("Only OWNER can delete tasks");
        }

        Task task = taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        taskRepository.delete(task);

        // ── Broadcast live update ──────────────────────────────
        eventPublisher.taskDeleted(projectId, currentUserId.toString(), taskId);
    }

    /*
     * BOARD VIEW
     */
    public BoardResponseDTO getProjectBoard(UUID projectId, UUID currentUserId) {

        getValidatedMember(projectId, currentUserId);

        List<Task> tasks =
                taskRepository.findByProjectIdOrderByStatusAscPositionAsc(projectId);

        Map<TaskStatus, List<TaskSummaryDTO>> grouped =
                tasks.stream()
                        .map(task -> TaskSummaryDTO.builder()
                                .id(task.getId())
                                .title(task.getTitle())
                                .status(task.getStatus())
                                .assignedTo(task.getAssignedTo())
                                .createdAt(
                                        java.time.LocalDateTime.ofInstant(
                                                task.getCreatedAt(),
                                                java.time.ZoneId.systemDefault()
                                        )
                                )
                                .build())
                        .collect(Collectors.groupingBy(TaskSummaryDTO::getStatus));

        List<BoardColumnDTO> columns =
                Arrays.stream(TaskStatus.values())
                        .map(status -> BoardColumnDTO.builder()
                                .status(status)
                                .tasks(grouped.getOrDefault(status, List.of()))
                                .build())
                        .toList();

        return BoardResponseDTO.builder()
                .projectId(projectId)
                .columns(columns)
                .build();
    }

    /*
     * MOVE TASK
     */
    @Transactional
    public TaskResponse moveTask(UUID projectId,
                                 UUID taskId,
                                 UUID currentUserId,
                                 TaskStatus newStatus,
                                 Long newPosition,
                                 Long version) {

        Task task = taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        ProjectMember member = getValidatedMember(projectId, currentUserId);

        boolean isOwner   = member.getRole() == ProjectRole.OWNER;
        boolean isCreator = task.getCreatedBy().equals(currentUserId);

        if (!isOwner && !isCreator) {
            throw new UnauthorizedException("Not authorized to move task");
        }

        if (newStatus != null)   task.setStatus(newStatus);
        if (newPosition != null) task.setPosition(newPosition);

        TaskResponse response = mapToResponse(taskRepository.save(task));

        // ── Broadcast live update ──────────────────────────────
        eventPublisher.taskMoved(projectId, currentUserId.toString(), response);

        return response;
    }

    /*
     * HELPERS
     */
    private TaskResponse mapToResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .assignedTo(task.getAssignedTo())
                .createdBy(task.getCreatedBy())
                .createdAt(task.getCreatedAt())
                .version(task.getVersion())
                .build();
    }

    private ProjectMember getValidatedMember(UUID projectId, UUID userId) {
        return projectMemberRepository
                .findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new UnauthorizedException("Not a project member"));
    }

    private void validateAssignment(UUID projectId, UUID userId) {
        projectMemberRepository
                .findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new UnauthorizedException("Assigned user is not a project member"));
    }
    public UUID getTaskCreatedBy(UUID projectId, UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
 
        if (!task.getProjectId().equals(projectId)) {
            throw new RuntimeException("Task does not belong to this project");
        }
 
        return task.getCreatedBy();
    }
}