package com.collabsphere.project.ai;

import com.collabsphere.project.ai.dto.AIImportTasksRequest;
import com.collabsphere.project.ai.dto.AITaskGenerationResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    private final AIService aiService;

    // ─────────────────────────────────────────────────────────
    // GENERATE PROJECT TASKS
    // ─────────────────────────────────────────────────────────
    @PostMapping("/projects/{projectId}/generate-tasks")
    public ResponseEntity<AITaskGenerationResponse>
    generateTasks(
            @PathVariable UUID projectId,
            Authentication authentication
    ) {

        UUID userId =
                UUID.fromString(authentication.getName());

        AITaskGenerationResponse response =
                aiService.generateProjectTasks(
                        projectId,
                        userId
                );

        return ResponseEntity.ok(response);
    }
    @PostMapping("/projects/{projectId}/import-tasks")
public ResponseEntity<?> importTasks(
        @PathVariable UUID projectId,
        @RequestBody AIImportTasksRequest request,
        Authentication authentication
) {

    UUID userId =
            UUID.fromString(authentication.getName());

    aiService.importGeneratedTasks(
            projectId,
            userId,
            request
    );

    return ResponseEntity.ok(
            java.util.Map.of(
                    "message",
                    "Tasks imported successfully"
            )
    );
}
}