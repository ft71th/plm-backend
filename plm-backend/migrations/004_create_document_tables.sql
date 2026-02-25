-- 004: Document Engine tables
-- doc_templates: reusable document templates
-- documents: project-specific documents created from templates

CREATE TABLE IF NOT EXISTS doc_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  version VARCHAR(50) DEFAULT '1.0',
  schema JSONB NOT NULL DEFAULT '{}',
  company_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_templates_category ON doc_templates(category);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES doc_templates(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  doc_number VARCHAR(100),
  version VARCHAR(50) DEFAULT '0.1',
  status VARCHAR(50) DEFAULT 'draft',
  metadata JSONB DEFAULT '{}',
  section_data JSONB DEFAULT '{}',
  revision_log JSONB DEFAULT '[]',
  created_by VARCHAR(255) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON documents(template_id);
