// cleanup-templates.js - Remove duplicates, verify all templates exist
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function cleanup() {
  console.log('🔍 Checking doc_templates...\n');

  // 1. Show all templates
  const all = await pool.query('SELECT id, name, type, category, created_at FROM doc_templates ORDER BY category, name, created_at');
  console.log(`Found ${all.rows.length} templates:\n`);
  all.rows.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.category}] ${r.name} (type: ${r.type}) — ${r.id.slice(0, 8)}... created: ${r.created_at}`);
  });

  // 2. Find duplicates (same name)
  const dupes = await pool.query(`
    SELECT name, type, COUNT(*) as cnt, array_agg(id ORDER BY created_at) as ids
    FROM doc_templates
    GROUP BY name, type
    HAVING COUNT(*) > 1
  `);

  if (dupes.rows.length === 0) {
    console.log('\n✅ No duplicates found!');
  } else {
    console.log(`\n⚠️  Found ${dupes.rows.length} duplicate groups:\n`);
    for (const d of dupes.rows) {
      console.log(`  "${d.name}" (${d.type}): ${d.cnt} copies`);
      // Keep first (oldest), delete rest
      const toDelete = d.ids.slice(1);
      
      // Check if any documents reference the duplicates we want to delete
      for (const delId of toDelete) {
        const docs = await pool.query('SELECT COUNT(*) FROM documents WHERE template_id = $1', [delId]);
        if (parseInt(docs.rows[0].count) > 0) {
          // Reassign documents to the kept template
          await pool.query('UPDATE documents SET template_id = $1 WHERE template_id = $2', [d.ids[0], delId]);
          console.log(`    → Reassigned ${docs.rows[0].count} documents from ${delId.slice(0, 8)} to ${d.ids[0].slice(0, 8)}`);
        }
      }

      await pool.query('DELETE FROM doc_templates WHERE id = ANY($1)', [toDelete]);
      console.log(`    → Deleted ${toDelete.length} duplicates, kept ${d.ids[0].slice(0, 8)}...`);
    }
  }

  // 3. Show final state
  const final = await pool.query('SELECT id, name, type, category FROM doc_templates ORDER BY category, name');
  console.log(`\n📋 Final templates (${final.rows.length}):\n`);
  final.rows.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.category}] ${r.name}`);
  });

  // 4. Check if Requirements Specification exists
  const req = await pool.query("SELECT id FROM doc_templates WHERE name = 'Requirements Specification'");
  if (req.rows.length === 0) {
    console.log('\n⚠️  Requirements Specification is MISSING! Run: node seed-templates.js');
  } else {
    console.log('\n✅ Requirements Specification exists');
  }

  pool.end();
}

cleanup().catch(err => {
  console.error('❌ Error:', err);
  pool.end();
  process.exit(1);
});
