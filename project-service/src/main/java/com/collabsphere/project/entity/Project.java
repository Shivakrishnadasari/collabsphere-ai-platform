package com.collabsphere.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue
    @Column(updatable = false, nullable = false)
    private UUID id;

    
    @Column(length = 500)
private String shortDescription;


    @Column(nullable = false)
    private UUID createdBy; // userId from JWT

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
@Column(nullable = false)
@Builder.Default
private Boolean archived = false;


private Instant archivedAt;

@Column(nullable = false, length = 150)
private String title;

@Column(columnDefinition = "TEXT")
private String detailedDescription;

@Column(length = 1000)
private String techStack;

@Column(length = 3000)
private String requirements;

@Column(length = 100)
private String difficultyLevel;

@Column(length = 100)
private String category;

@Column(length = 100)
private String expectedDuration;

@Column(nullable = false)
@Enumerated(EnumType.STRING)
@Builder.Default
private ProjectStatus status=ProjectStatus.DRAFT;

@Column
private Integer maxMembers;

@Column
private LocalDateTime recruitmentDeadline;

@Column(nullable = false)
@Builder.Default
private Boolean recruitingOpen = true;

}