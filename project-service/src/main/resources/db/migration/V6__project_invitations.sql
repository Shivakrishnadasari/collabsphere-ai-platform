CREATE TABLE project_invitations (

    id UUID PRIMARY KEY,

    project_id UUID NOT NULL,

    invited_by UUID NOT NULL,

    invitee_email VARCHAR(255) NOT NULL,

    role VARCHAR(50) NOT NULL,

    token VARCHAR(500) NOT NULL UNIQUE,

    status VARCHAR(50) NOT NULL,

    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP NOT NULL,

    responded_at TIMESTAMP
);