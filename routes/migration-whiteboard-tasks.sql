-- Migration: Move whiteboard and task data from localStorage to PostgreSQL
-- Run this against your PLM database

-- Whiteboard data (one JSON blob per project)
CREATE TABLE IF NOT EXISTS whiteboard_data (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task boards (one JSON array per project)
CREATE TABLE IF NOT EXISTS task_boards (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task items (one JSON array per project)
CREATE TABLE IF NOT EXISTS task_items (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_whiteboard_data_updated ON whiteboard_data(updated_at);
CREATE INDEX IF NOT EXISTS idx_task_boards_updated ON task_boards(updated_at);
CREATE INDEX IF NOT EXISTS idx_task_items_updated ON task_items(updated_at);
