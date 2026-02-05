// run-migration.js — Kör databasmigration för collaboration
// Användning: node run-migration.js

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migration-collab.sql'), 
      'utf8'
    );
    
    console.log('🔄 Running collaboration migration...\n');
    await client.query(sql);
    
    // Verifiera
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('yjs_documents', 'project_members')
      ORDER BY table_name
    `);
    
    console.log('✅ Migration complete! Tables:');
    tables.rows.forEach(r => console.log(`   • ${r.table_name}`));
    
    // Visa kolumner i project_members
    const cols = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'project_members'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 project_members columns:');
    cols.rows.forEach(c => console.log(`   • ${c.column_name} (${c.data_type}) ${c.column_default ? '= ' + c.column_default : ''}`));
    
    console.log('\n🎉 Ready for collaboration!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
