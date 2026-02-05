-- Migration: Add Yjs collaboration support
-- Kör: psql -h localhost -U plm -d plm -f migration-collab.sql
-- Eller: node run-migration.js

-- 1. Tabell för Yjs-dokument (CRDT state persistence)
CREATE TABLE IF NOT EXISTS yjs_documents (
  name VARCHAR(255) PRIMARY KEY,
  data BYTEA,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Säkerställ att project_members har role-kolumn
-- (Tabellen finns troligen redan, men vi lägger till role om den saknas)
DO $$ 
BEGIN
  -- Skapa tabellen om den inte finns
  CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'reviewer', 'viewer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
  );
  
  -- Lägg till role-kolumn om den saknas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE project_members ADD COLUMN role VARCHAR(20) DEFAULT 'editor' 
      CHECK (role IN ('admin', 'editor', 'reviewer', 'viewer'));
  END IF;
END $$;

-- 3. Index för snabba lookups
CREATE INDEX IF NOT EXISTS idx_yjs_documents_updated ON yjs_documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);

-- Klart!
-- Verifiera:
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('yjs_documents', 'project_members');
