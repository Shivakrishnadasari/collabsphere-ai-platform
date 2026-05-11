package com.collabsphere.project.repository;

import com.collabsphere.project.entity.Task;
import com.collabsphere.project.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

    @Repository
    public interface TaskRepository extends JpaRepository<Task, UUID> {
    @Query("""
        SELECT MAX(t.position)
        FROM Task t
        WHERE t.projectId = :projectId
        AND t.status = :status
        """)
    Optional<Long> findMaxPosition(UUID projectId, TaskStatus status);

    List<Task> findByProjectIdOrderByStatusAscPositionAsc(UUID projectId);

    Page<Task> findByProjectId(UUID projectId, Pageable pageable);

    List<Task> findByProjectIdAndStatus(UUID projectId, TaskStatus status);

    List<Task> findByAssignedTo(UUID userId);

    Optional<Task> findByIdAndProjectId(UUID taskId, UUID projectId);
    Page<Task> findByProjectIdAndStatus(UUID projectId,
                                    TaskStatus status,
                                    Pageable pageable);
}