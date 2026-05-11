-- Add archived columns to projects table
-- ProjectRole is VARCHAR so no changes needed for TEAM_LEAD

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS archived    BOOLEAN   NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;