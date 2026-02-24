// cleanup-old-dupes.js - Remove old templates where newer richer version exists
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Semantic duplicates: old type → new type (keep new, delete old)
const OLD_DUPES = [
  { name: 'Interface Control Document', old_type: 'arch_interface', new_type: 'icd' },
  { name: 'System Architecture Description', old_type: 'arch_system', new_type: 'architecture' },
  { name: 'FMEA Risk Analysis', old_type: 'risk_fmea', new_type: 'risk_analysis' },
  { name: 'SAT Protocol', old_type: 'test_sat', keep_name: 'Site Acceptance Test (SAT)' },
  { name: 'FAT Protocol', old_type: 'test_fat', keep_name: 'Factory Acceptance Test (FAT)' },
];

async function cleanup() {
  console.log('🧹 Removing old duplicate templates...\n');

  for (const d of OLD_DUPES) {
    const old = await pool.query(
      'SELECT id FROM doc_templates WHERE name = $1 AND type = $2',
      [d.name, d.old_type]
    );

    if (old.rows.length === 0) {
      console.log(`  ⏭  "${d.name}" (${d.old_type}) — not found, skipping`);
      continue;
    }

    const oldId = old.rows[0].id;

    // Find the new version to reassign docs to
    let newId = null;
    if (d.new_type) {
      const nw = await pool.query('SELECT id FROM doc_templates WHERE name = $1 AND type = $2', [d.name, d.new_type]);
      if (nw.rows.length > 0) newId = nw.rows[0].id;
    } else if (d.keep_name) {
      const nw = await pool.query('SELECT id FROM doc_templates WHERE name = $1', [d.keep_name]);
      if (nw.rows.length > 0) newId = nw.rows[0].id;
    }

    // Reassign any documents
    if (newId) {
      const docs = await pool.query('SELECT COUNT(*) FROM documents WHERE template_id = $1', [oldId]);
      if (parseInt(docs.rows[0].count) > 0) {
        await pool.query('UPDATE documents SET template_id = $1 WHERE template_id = $2', [newId, oldId]);
        console.log(`  ↗  Reassigned ${docs.rows[0].count} docs from old → new`);
      }
    }

    await pool.query('DELETE FROM doc_templates WHERE id = $1', [oldId]);
    console.log(`  ✅ Removed "${d.name}" (${d.old_type})`);
  }

  // Final state
  const final = await pool.query('SELECT name, type, category FROM doc_templates ORDER BY category, name');
  console.log(`\n📋 Final templates (${final.rows.length}):\n`);
  final.rows.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.category}] ${r.name}`);
  });

  pool.end();
}

cleanup().catch(err => {
  console.error('❌ Error:', err);
  pool.end();
  process.exit(1);
});
