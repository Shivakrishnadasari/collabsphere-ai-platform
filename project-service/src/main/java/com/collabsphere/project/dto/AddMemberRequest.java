package com.collabsphere.project.dto;

import com.collabsphere.project.entity.ProjectRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class AddMemberRequest {

    @NotNull
    private UUID userId;

    @NotNull
    private ProjectRole role;
}
