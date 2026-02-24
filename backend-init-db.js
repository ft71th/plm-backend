// init-db.js - Initialize database tables
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const initDB = async () => {
  try {
    console.log('🔄 Initializing database...');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // Projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(50) DEFAULT '1.0',
        owner_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Projects table created');

    // Project members (for collaboration)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'editor',
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      );
    `);
    console.log('✅ Project members table created');

    // Nodes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        node_id VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        position_x FLOAT NOT NULL,
        position_y FLOAT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id)
      );
    `);
    console.log('✅ Nodes table created');

    // Edges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS edges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        edge_id VARCHAR(50) NOT NULL,
        source VARCHAR(50) NOT NULL,
        target VARCHAR(50) NOT NULL,
        source_handle VARCHAR(100),
        target_handle VARCHAR(100),
        type VARCHAR(50),
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Edges table created');

    // Whiteboards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whiteboards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        whiteboard_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'whiteboard',
        nodes JSONB DEFAULT '[]',
        edges JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Whiteboards table created');

    // Activity log (for version history)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        changes JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Activity log table created');

    // Gantt / Timeline data (per project, JSONB blob)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gantt_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
        data JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_gantt_data_project_id ON gantt_data(project_id);
    `);
    console.log('✅ Gantt data table created');

    // Document templates
    await pool.query(`
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
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_doc_templates_category ON doc_templates(category);
    `);
    console.log('✅ Doc templates table created');

    // Documents (project-specific, from templates)
    await pool.query(`
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
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_template_id ON documents(template_id);
    `);
    console.log('✅ Documents table created');

    console.log('');
    console.log('🎉 Database initialization complete!');
    
    pool.end();
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    pool.end();
    process.exit(1);
  }
};

initDB();