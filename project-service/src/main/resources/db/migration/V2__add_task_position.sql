ALTER TABLE tasks
ADD COLUMN position BIGINT;

CREATE INDEX idx_task_position
ON tasks(position);