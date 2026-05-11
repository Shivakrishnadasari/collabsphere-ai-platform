package com.collabsphere.project.ai;

import com.collabsphere.project.ai.dto.AIImportTasksRequest;
import com.collabsphere.project.ai.dto.AITaskGenerationResponse;
import com.collabsphere.project.ai.dto.AITaskSuggestion;

import com.collabsphere.project.entity.Project;
import com.collabsphere.project.entity.Task;
import com.collabsphere.project.entity.TaskStatus;

import com.collabsphere.project.repository.ProjectRepository;
import com.collabsphere.project.repository.TaskRepository;

import com.collabsphere.project.service.ProjectPermissionService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.http.HttpHeaders;

import org.springframework.stereotype.Service;

import org.springframework.web.reactive.function.client.WebClient;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AIService {

    private final WebClient webClient;

    private final ObjectMapper objectMapper =
            new ObjectMapper();

    private final ProjectRepository projectRepository;

    private final ProjectPermissionService permissions;

    private final TaskRepository taskRepository;

    // ─────────────────────────────────────────────────────────
    // SYSTEM PROMPT
    // ─────────────────────────────────────────────────────────
    private static final String DEFAULT_SYSTEM_PROMPT =
            """
            You are an expert AI software architect and project planner.

            Always return VALID JSON only.

            Generate:
            - projectSummary
            - suggestedMilestones
            - tasks

            Each task must contain:
            - title
            - description
            - priority
            - suggestedRole
            - estimatedHours

            Example:

            {
              "projectSummary": "...",
              "suggestedMilestones": [
                "...",
                "..."
              ],
              "tasks": [
                {
                  "title": "...",
                  "description": "...",
                  "priority": "HIGH",
                  "suggestedRole": "BACKEND_DEVELOPER",
                  "estimatedHours": 8
                }
              ]
            }

            Return ONLY JSON.
            """;

    // ─────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────
    public AIService(
            @Value("${ai.apiKey}") String apiKey,
            ProjectRepository projectRepository,
            ProjectPermissionService permissions,
            TaskRepository taskRepository
    ) {

        this.projectRepository = projectRepository;

        this.permissions = permissions;

        this.taskRepository = taskRepository;

        this.webClient = WebClient.builder()
                .baseUrl("https://api.groq.com/openai/v1")
                .defaultHeader(
                        HttpHeaders.AUTHORIZATION,
                        "Bearer " + apiKey
                )
                .defaultHeader(
                        HttpHeaders.CONTENT_TYPE,
                        "application/json"
                )
                .defaultHeader(
                        HttpHeaders.ACCEPT,
                        "application/json"
                )
                .build();
    }

    // ─────────────────────────────────────────────────────────
    // GENERIC AI CALL
    // ─────────────────────────────────────────────────────────
    public String callAI(
            String message,
            String systemPrompt
    ) {

        try {

            String sys =
                    (systemPrompt != null
                            && !systemPrompt.isBlank())
                            ? systemPrompt
                            : DEFAULT_SYSTEM_PROMPT;

            Map<String, Object> request =
                    new HashMap<>();

            request.put(
                    "model",
                    "llama3-8b-8192"
            );

            request.put(
                    "temperature",
                    0.4
            );

            request.put(
                    "max_tokens",
                    2000
            );

            List<Map<String, String>> messages =
                    new ArrayList<>();

            messages.add(
                    Map.of(
                            "role",
                            "system",
                            "content",
                            sys
                    )
            );

            messages.add(
                    Map.of(
                            "role",
                            "user",
                            "content",
                            message
                    )
            );

            request.put("messages", messages);

            Map<?, ?> response = webClient.post()
                    .uri("/chat/completions")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null) {

                throw new RuntimeException(
                        "No AI response received"
                );
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices =
                    (List<Map<String, Object>>)
                            response.get("choices");

            @SuppressWarnings("unchecked")
            Map<String, Object> messageObj =
                    (Map<String, Object>)
                            choices.get(0)
                                    .get("message");

            return messageObj
                    .get("content")
                    .toString();

        } catch (Exception e) {

            throw new RuntimeException(
                    "AI service failed: "
                            + e.getMessage()
            );
        }
    }

    // ─────────────────────────────────────────────────────────
    // GENERATE PROJECT TASKS
    // ─────────────────────────────────────────────────────────
    public AITaskGenerationResponse generateProjectTasks(
            UUID projectId,
            UUID userId
    ) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Project not found"
                        ));

 permissions.requireAtLeastMember(
        projectId,
        userId
);

        return generateTasksFromProject(project);
    }

    // ─────────────────────────────────────────────────────────
    // GENERATE TASKS FROM PROJECT
    // ─────────────────────────────────────────────────────────
    public AITaskGenerationResponse generateTasksFromProject(
            Project project
    ) {

        String prompt =
                """
                Analyze the following software project
                and generate:

                1. Project summary
                2. Suggested milestones
                3. Development tasks

                PROJECT TITLE:
                %s

                SHORT DESCRIPTION:
                %s

                DETAILED DESCRIPTION:
                %s

                REQUIREMENTS:
                %s

                TECH STACK:
                %s
                """
                        .formatted(
                                project.getTitle(),
                                project.getShortDescription(),
                                project.getDetailedDescription(),
                                project.getRequirements(),
                                project.getTechStack()
                        );

        String aiResponse =
                callAI(
                        prompt,
                        DEFAULT_SYSTEM_PROMPT
                );

        return parseTaskGenerationResponse(
                aiResponse
        );
    }

    // ─────────────────────────────────────────────────────────
    // IMPORT GENERATED TASKS
    // ─────────────────────────────────────────────────────────
    public void importGeneratedTasks(
            UUID projectId,
            UUID userId,
            AIImportTasksRequest request
    ) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Project not found"
                        ));

        permissions.requireAtLeastTeamLead(
                projectId,
                userId
        );

        if (request.getTasks() == null
                || request.getTasks().isEmpty()) {

            throw new RuntimeException(
                    "No tasks provided"
            );
        }

        for (AITaskSuggestion suggestion
                : request.getTasks()) {

            Task task = Task.builder()
                    .projectId(projectId)
                    .title(suggestion.getTitle())
                    .description(
                            suggestion.getDescription()
                    )
                    .status(TaskStatus.TODO)
                    .createdBy(userId)
                    .build();

            taskRepository.save(task);
        }
    }

    // ─────────────────────────────────────────────────────────
    // PARSE AI RESPONSE
    // ─────────────────────────────────────────────────────────
    private AITaskGenerationResponse
    parseTaskGenerationResponse(
            String aiResponse
    ) {

        try {

            String cleanedResponse =
                    cleanJson(aiResponse);

            JsonNode root =
                    objectMapper.readTree(
                            cleanedResponse
                    );

            String summary =
                    root.path("projectSummary")
                            .asText();

            List<String> milestones =
                    new ArrayList<>();

            JsonNode milestoneNode =
                    root.path("suggestedMilestones");

            if (milestoneNode.isArray()) {

                for (JsonNode node
                        : milestoneNode) {

                    milestones.add(
                            node.asText()
                    );
                }
            }

            List<AITaskSuggestion> tasks =
                    new ArrayList<>();

            JsonNode tasksNode =
                    root.path("tasks");

            if (tasksNode.isArray()) {

                for (JsonNode taskNode
                        : tasksNode) {

                    AITaskSuggestion task =
                            AITaskSuggestion.builder()
                                    .title(
                                            taskNode.path("title")
                                                    .asText()
                                    )
                                    .description(
                                            taskNode.path("description")
                                                    .asText()
                                    )
                                    .priority(
                                            taskNode.path("priority")
                                                    .asText("MEDIUM")
                                    )
                                    .suggestedRole(
                                            taskNode.path("suggestedRole")
                                                    .asText("MEMBER")
                                    )
                                    .estimatedHours(
                                            taskNode.path("estimatedHours")
                                                    .asInt(4)
                                    )
                                    .build();

                    tasks.add(task);
                }
            }

            return AITaskGenerationResponse.builder()
                    .projectSummary(summary)
                    .suggestedMilestones(milestones)
                    .tasks(tasks)
                    .build();

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to parse AI response: "
                            + e.getMessage()
            );
        }
    }

    // ─────────────────────────────────────────────────────────
    // CLEAN AI JSON
    // ─────────────────────────────────────────────────────────
    private String cleanJson(
            String response
    ) {

        return response
                .replace("```json", "")
                .replace("```", "")
                .trim();
    }
}