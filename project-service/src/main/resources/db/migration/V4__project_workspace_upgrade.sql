ALTER TABLE projects
RENAME COLUMN name TO title;

ALTER TABLE projects
RENAME COLUMN description TO short_description;

ALTER TABLE projects
ADD COLUMN detailed_description TEXT,
ADD COLUMN tech_stack VARCHAR(1000),
ADD COLUMN requirements VARCHAR(2000),
ADD COLUMN category VARCHAR(100),
ADD COLUMN difficulty_level VARCHAR(100),
ADD COLUMN expected_duration VARCHAR(100),
ADD COLUMN status VARCHAR(50) DEFAULT 'DRAFT',
ADD COLUMN max_members INT,
ADD COLUMN recruitment_deadline TIMESTAMP,
ADD COLUMN recruiting_open BOOLEAN DEFAULT TRUE;