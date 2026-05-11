CREATE TABLE project_attachments (

    id UUID PRIMARY KEY,

    project_id UUID NOT NULL,

    file_name VARCHAR(500) NOT NULL,

    original_file_name VARCHAR(500) NOT NULL,

    file_url VARCHAR(1000) NOT NULL,

    file_type VARCHAR(255) NOT NULL,

    file_size BIGINT NOT NULL,

    uploaded_by UUID NOT NULL,

    uploaded_at TIMESTAMP NOT NULL
);