// update-template-filters.js - Add smart filters to dynamic_table sections
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function update() {
  console.log('🔧 Updating template filters...\n');

  // 1. Customer Requirements Specification → filter to customer reqType
  const crs = await pool.query("SELECT id, schema FROM doc_templates WHERE name = 'Customer Requirements Specification'");
  if (crs.rows.length > 0) {
    const schema = crs.rows[0].schema;
    let updated = false;
    for (const sec of (schema.sections || [])) {
      if (sec.type === 'dynamic_table' && !sec.filter) {
        sec.filter = { reqTypes: ['customer'] };
        updated = true;
      }
    }
    if (updated) {
      await pool.query('UPDATE doc_templates SET schema = $1 WHERE id = $2', [JSON.stringify(schema), crs.rows[0].id]);
      console.log('  ✅ Customer Requirements Specification — filter: reqTypes: [customer]');
    } else {
      console.log('  ⏭  Customer Requirements Specification — already has filters or no dynamic_table sections');
    }
  } else {
    console.log('  ⚠️  Customer Requirements Specification not found');
  }

  // 2. Requirements Specification (my new one) → change functional_requirements to dynamic_table
  const rs = await pool.query("SELECT id, schema FROM doc_templates WHERE name = 'Requirements Specification'");
  if (rs.rows.length > 0) {
    const schema = rs.rows[0].schema;
    let updated = false;
    for (const sec of (schema.sections || [])) {
      if (sec.id === 'functional_requirements' && sec.type === 'manual_table') {
        sec.type = 'dynamic_table';
        sec.filter = {}; // All requirement types
        // Keep columns as fallback reference but dynamic_table renders from PLM nodes
        updated = true;
      }
    }
    if (updated) {
      await pool.query('UPDATE doc_templates SET schema = $1 WHERE id = $2', [JSON.stringify(schema), rs.rows[0].id]);
      console.log('  ✅ Requirements Specification — functional_requirements → dynamic_table (all types)');
    } else {
      console.log('  ⏭  Requirements Specification — already updated');
    }
  }

  // 3. Show all templates with dynamic_table sections and their filters
  const all = await pool.query('SELECT name, schema FROM doc_templates ORDER BY name');
  console.log('\n📋 Templates with dynamic_table sections:\n');
  for (const row of all.rows) {
    const dynSections = (row.schema?.sections || []).filter(s => s.type === 'dynamic_table');
    if (dynSections.length > 0) {
      console.log(`  ${row.name}:`);
      for (const s of dynSections) {
        const filterStr = s.filter ? JSON.stringify(s.filter) : '(no filter — shows all)';
        console.log(`    → ${s.title || s.id}: ${filterStr}`);
      }
    }
  }

  pool.end();
}

update().catch(err => {
  console.error('❌ Error:', err);
  pool.end();
  process.exit(1);
});
