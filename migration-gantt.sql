-- Migration: Add gantt_data table for timeline/Gantt persistence
-- Run this against your PostgreSQL database
-- Pattern matches: whiteboard_data, task_boards, task_items

CREATE TABLE IF NOT EXISTS gantt_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by project
CREATE INDEX IF NOT EXISTS idx_gantt_data_project_id ON gantt_data(project_id);
