-- =====================================================
-- Component Library Tables
-- Migration: 003_create_library_tables.sql
-- =====================================================

-- Library Items (master definitions)
CREATE TABLE IF NOT EXISTS library_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,  -- system, subsystem, function, hardware, requirement, etc.
    tags TEXT[],                -- Array of tags for searching
    owner VARCHAR(255),
    current_version VARCHAR(20) DEFAULT '1.0',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Library Versions (immutable snapshots)
CREATE TABLE IF NOT EXISTS library_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    branch VARCHAR(100) DEFAULT 'main',
    parent_version_id UUID REFERENCES library_versions(id),
    node_data JSONB NOT NULL,       -- Full node data snapshot
    changelog TEXT,
    state VARCHAR(20) DEFAULT 'released',  -- draft, released, deprecated
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(library_item_id, version, branch)
);

-- Library Usage Tracking (which projects use which library items)
CREATE TABLE IF NOT EXISTS library_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    library_item_id UUID NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES library_versions(id),
    node_id VARCHAR(255) NOT NULL,  -- The node ID in the project
    use_latest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, node_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_library_items_type ON library_items(type);
CREATE INDEX IF NOT EXISTS idx_library_items_name ON library_items(name);
CREATE INDEX IF NOT EXISTS idx_library_items_tags ON library_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_library_versions_item ON library_versions(library_item_id);
CREATE INDEX IF NOT EXISTS idx_library_versions_version ON library_versions(version);
CREATE INDEX IF NOT EXISTS idx_library_usage_project ON library_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_library_usage_item ON library_usage(library_item_id);

-- Full-text search on library items
CREATE INDEX IF NOT EXISTS idx_library_items_search ON library_items 
    USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
