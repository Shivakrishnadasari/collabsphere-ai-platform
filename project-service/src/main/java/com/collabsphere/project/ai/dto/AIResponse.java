package com.collabsphere.project.ai.dto;

public class AIResponse {

    private String type;
    private String content;

    public AIResponse(String type, String content) {
        this.type = type;
        this.content = content;
    }

    public String getType() {
        return type;
    }

    public String getContent() {
        return content;
    }
}