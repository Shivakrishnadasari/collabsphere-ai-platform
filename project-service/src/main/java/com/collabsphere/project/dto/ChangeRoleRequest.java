package com.collabsphere.project.dto;

import com.collabsphere.project.entity.ProjectRole;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChangeRoleRequest {
    private ProjectRole role;
}