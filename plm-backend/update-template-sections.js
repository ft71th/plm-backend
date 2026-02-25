// update-template-sections.js
// Adds sequence_embed to Architecture template,
// adds auto-populated alarm_list to Alarm template,
// and seeds templates as needed.
//
// Run: node update-template-sections.js

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  client_encoding: 'UTF8',
});

async function run() {
  const client = await pool.connect();
  try {
    // ── 1. System Architecture Description: add sequence_embed ──
    const archRes = await client.query(
      `SELECT id, schema FROM doc_templates WHERE name = 'System Architecture Description' LIMIT 1`
    );
    if (archRes.rows.length) {
      const t = archRes.rows[0];
      const schema = t.schema;
      const sections = schema.sections || [];

      // Check if already has sequence_embed
      if (!sections.find(s => s.type === 'sequence_embed')) {
        // Insert before Design Decisions (or before refs, or at end)
        const ddIdx = sections.findIndex(s => s.id === 'design_decisions');
        const insertIdx = ddIdx >= 0 ? ddIdx : sections.length - 1;

        sections.splice(insertIdx, 0, {
          id: 'seq_diagram',
          title: `${insertIdx + 1}. Sequence Diagrams`,
          type: 'sequence_embed',
        });

        // Re-number titles
        sections.forEach((s, i) => {
          const match = s.title.match(/^\d+\.\s*(.*)/);
          if (match) s.title = `${i + 1}. ${match[1]}`;
        });

        schema.sections = sections;
        await client.query(
          `UPDATE doc_templates SET schema = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(schema), t.id]
        );
        console.log('✅ System Architecture Description: added sequence_embed section');
      } else {
        console.log('ℹ️  System Architecture Description: already has sequence_embed');
      }
    } else {
      console.log('⚠️  System Architecture Description template not found');
    }

    // ── 2. Alarm & Event List: add auto-populated alarm_list ──
    const alarmRes = await client.query(
      `SELECT id, schema FROM doc_templates WHERE name = 'Alarm & Event List' LIMIT 1`
    );
    if (alarmRes.rows.length) {
      const t = alarmRes.rows[0];
      const schema = t.schema;
      const sections = schema.sections || [];

      if (!sections.find(s => s.type === 'alarm_list')) {
        // Insert after intro, before manual alarm table
        const introIdx = sections.findIndex(s => s.id === 'intro');
        const insertIdx = introIdx >= 0 ? introIdx + 1 : 1;

        sections.splice(insertIdx, 0, {
          id: 'auto_alarms',
          title: `${insertIdx + 1}. Auto-Derived Alarms (from PLM)`,
          type: 'alarm_list',
        });

        // Re-number
        sections.forEach((s, i) => {
          const match = s.title.match(/^\d+\.\s*(.*)/);
          if (match) s.title = `${i + 1}. ${match[1]}`;
        });

        schema.sections = sections;
        await client.query(
          `UPDATE doc_templates SET schema = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(schema), t.id]
        );
        console.log('✅ Alarm & Event List: added auto-populated alarm_list section');
      } else {
        console.log('ℹ️  Alarm & Event List: already has alarm_list');
      }
    } else {
      console.log('⚠️  Alarm & Event List template not found');
    }

    // ── 3. Print summary ──
    const allRes = await client.query(`SELECT name, schema FROM doc_templates ORDER BY name`);
    console.log('\n📋 All templates and their section types:');
    for (const row of allRes.rows) {
      const sects = (row.schema?.sections || []).map(s => s.type);
      console.log(`  ${row.name}: [${sects.join(', ')}]`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
