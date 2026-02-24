// seed-templates.js - Seed document templates for Document Engine
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ═══════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS
// ═══════════════════════════════════════════════════════════

const templates = [

  // ── REQUIREMENTS ──────────────────────────────────────────
  {
    name: 'Requirements Specification',
    type: 'requirements',
    category: 'requirements',
    description: 'System and functional requirements specification with traceability matrix, verification methods and acceptance criteria.',
    version: '1.0',
    schema: {
      metadata_fields: [
        { key: 'system_name', label: 'System Name', type: 'text', required: true },
        { key: 'system_id', label: 'System ID', type: 'text', required: true },
        { key: 'classification', label: 'Classification', type: 'select', options: ['Public', 'Internal', 'Confidential'] },
        { key: 'customer', label: 'Customer', type: 'text' },
        { key: 'project_phase', label: 'Project Phase', type: 'select', options: ['Concept', 'Design', 'Implementation', 'Testing', 'Delivery'] },
        { key: 'approved_by', label: 'Approved By', type: 'text' },
        { key: 'approval_date', label: 'Approval Date', type: 'date' },
      ],
      sections: [
        {
          id: 'scope',
          title: '1. Scope & Purpose',
          type: 'static',
          template_content: '<h3>1.1 Purpose</h3><p>This document defines the requirements for [system name]. It establishes the functional, performance, and interface requirements that the system shall satisfy.</p><h3>1.2 Scope</h3><p>This specification covers...</p><h3>1.3 Definitions & Abbreviations</h3><p>Define key terms here.</p>',
        },
        {
          id: 'references',
          title: '2. Applicable Documents',
          type: 'reference_list',
        },
        {
          id: 'system_overview',
          title: '3. System Overview',
          type: 'static',
          template_content: '<p>Provide a high-level description of the system, its operating environment, and its primary functions.</p>',
        },
        {
          id: 'functional_requirements',
          title: '4. Functional Requirements',
          type: 'manual_table',
          columns: [
            { key: 'req_id', label: 'Req. ID', type: 'text', auto_increment: true },
            { key: 'category', label: 'Category', type: 'select', options: ['Control', 'Monitoring', 'Safety', 'Communication', 'HMI', 'Power Management', 'Alarm'] },
            { key: 'description', label: 'Requirement', type: 'text', editable: true },
            { key: 'priority', label: 'Priority', type: 'select', options: ['Shall', 'Should', 'May'] },
            { key: 'rationale', label: 'Rationale', type: 'text', editable: true },
            { key: 'verification', label: 'Verification Method', type: 'select', options: ['Test', 'Analysis', 'Inspection', 'Demonstration'] },
            { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Reviewed', 'Approved', 'Implemented', 'Verified'] },
          ],
        },
        {
          id: 'performance_requirements',
          title: '5. Performance Requirements',
          type: 'manual_table',
          columns: [
            { key: 'req_id', label: 'Req. ID', type: 'text', auto_increment: true },
            { key: 'parameter', label: 'Parameter', type: 'text', editable: true },
            { key: 'requirement', label: 'Requirement', type: 'text', editable: true },
            { key: 'min_value', label: 'Min', type: 'text', editable: true },
            { key: 'max_value', label: 'Max', type: 'text', editable: true },
            { key: 'unit', label: 'Unit', type: 'text', editable: true },
            { key: 'verification', label: 'Verification Method', type: 'select', options: ['Test', 'Analysis', 'Inspection', 'Demonstration'] },
          ],
        },
        {
          id: 'interface_requirements',
          title: '6. Interface Requirements',
          type: 'manual_table',
          columns: [
            { key: 'req_id', label: 'Req. ID', type: 'text', auto_increment: true },
            { key: 'interface', label: 'Interface', type: 'text', editable: true },
            { key: 'type', label: 'Type', type: 'select', options: ['Hardware', 'Software', 'Communication', 'Electrical', 'Mechanical'] },
            { key: 'description', label: 'Description', type: 'text', editable: true },
            { key: 'protocol', label: 'Protocol / Standard', type: 'text', editable: true },
            { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Reviewed', 'Approved'] },
          ],
        },
        {
          id: 'environmental',
          title: '7. Environmental & Regulatory Requirements',
          type: 'static',
          template_content: '<h3>7.1 Environmental Conditions</h3><p>Temperature range, humidity, vibration, EMC, IP rating etc.</p><h3>7.2 Regulatory Standards</h3><p>IEC 61162, DNV rules, class society requirements, etc.</p><h3>7.3 Safety Requirements</h3><p>Functional safety requirements (SIL levels, etc.)</p>',
        },
        {
          id: 'acceptance_criteria',
          title: '8. Acceptance Criteria',
          type: 'checklist',
        },
        {
          id: 'traceability',
          title: '9. Traceability Matrix',
          type: 'manual_table',
          columns: [
            { key: 'req_id', label: 'Req. ID', type: 'text', editable: true },
            { key: 'design_ref', label: 'Design Reference', type: 'text', editable: true },
            { key: 'test_ref', label: 'Test Case', type: 'text', editable: true },
            { key: 'plm_node', label: 'PLM Node', type: 'text', editable: true },
            { key: 'status', label: 'Coverage', type: 'select', options: ['Not Started', 'Partial', 'Full', 'N/A'] },
          ],
        },
        {
          id: 'approvals',
          title: '10. Approval',
          type: 'signature_block',
          signatories: [
            { role: 'Author', required: true },
            { role: 'Technical Reviewer', required: true },
            { role: 'Project Manager', required: true },
            { role: 'Customer Representative', required: false },
          ],
        },
      ],
      revision_history: true,
    },
  },

  // ── ARCHITECTURE ──────────────────────────────────────────
  {
    name: 'System Architecture Description',
    type: 'architecture',
    category: 'architecture',
    description: 'System architecture with component diagrams, interface definitions, and design decisions.',
    version: '1.0',
    schema: {
      metadata_fields: [
        { key: 'system_name', label: 'System Name', type: 'text', required: true },
        { key: 'system_id', label: 'System ID', type: 'text' },
        { key: 'classification', label: 'Classification', type: 'select', options: ['Public', 'Internal', 'Confidential'] },
      ],
      sections: [
        { id: 'intro', title: '1. Introduction', type: 'static', template_content: '<p>Overview of system architecture and design principles.</p>' },
        { id: 'arch_diagram', title: '2. System Architecture Diagram', type: 'architecture_view' },
        { id: 'components', title: '3. Component Descriptions', type: 'component_list' },
        { id: 'interfaces', title: '4. Interface Definitions', type: 'manual_table', columns: [
          { key: 'interface_id', label: 'IF ID', type: 'text' },
          { key: 'from', label: 'From', type: 'text', editable: true },
          { key: 'to', label: 'To', type: 'text', editable: true },
          { key: 'protocol', label: 'Protocol', type: 'text', editable: true },
          { key: 'description', label: 'Description', type: 'text', editable: true },
        ]},
        { id: 'io_list', title: '5. I/O List', type: 'io_list' },
        { id: 'design_decisions', title: '6. Design Decisions', type: 'static', template_content: '<p>Document key architectural decisions and their rationale.</p>' },
        { id: 'refs', title: '7. References', type: 'reference_list' },
        { id: 'approval', title: '8. Approval', type: 'signature_block', signatories: [
          { role: 'Author', required: true },
          { role: 'Technical Lead', required: true },
        ]},
      ],
      revision_history: true,
    },
  },

  // ── RISK / FMEA ──────────────────────────────────────────
  {
    name: 'FMEA Risk Analysis',
    type: 'risk_analysis',
    category: 'risk',
    description: 'Failure Mode and Effects Analysis with severity, occurrence, and detection ratings.',
    version: '1.0',
    schema: {
      metadata_fields: [
        { key: 'system_name', label: 'System / Subsystem', type: 'text', required: true },
        { key: 'fmea_type', label: 'FMEA Type', type: 'select', options: ['System', 'Design', 'Process'] },
        { key: 'analysis_date', label: 'Analysis Date', type: 'date' },
      ],
      sections: [
        { id: 'scope', title: '1. Scope & Boundaries', type: 'static', template_content: '<p>Define the system boundaries and assumptions for this FMEA.</p>' },
        { id: 'risk_matrix', title: '2. FMEA Worksheet', type: 'risk_matrix' },
        { id: 'actions', title: '3. Recommended Actions', type: 'manual_table', columns: [
          { key: 'action_id', label: 'ID', type: 'text' },
          { key: 'failure_ref', label: 'Failure Ref', type: 'text', editable: true },
          { key: 'action', label: 'Action', type: 'text', editable: true },
          { key: 'responsible', label: 'Responsible', type: 'text', editable: true },
          { key: 'deadline', label: 'Deadline', type: 'date' },
          { key: 'status', label: 'Status', type: 'select', options: ['Open', 'In Progress', 'Closed'] },
        ]},
        { id: 'summary', title: '4. Risk Summary', type: 'static', template_content: '<p>Summarize overall risk levels and key findings.</p>' },
        { id: 'approval', title: '5. Approval', type: 'signature_block', signatories: [
          { role: 'Analyst', required: true },
          { role: 'Project Manager', required: true },
        ]},
      ],
      revision_history: true,
    },
  },

  // ── TEST / FAT ────────────────────────────────────────────
  {
    name: 'Factory Acceptance Test (FAT)',
    type: 'test_protocol',
    category: 'test',
    description: 'FAT protocol with test procedures, pass/fail criteria, and sign-off.',
    version: '1.0',
    schema: {
      metadata_fields: [
        { key: 'system_name', label: 'System Name', type: 'text', required: true },
        { key: 'test_location', label: 'Test Location', type: 'text' },
        { key: 'test_date', label: 'Test Date', type: 'date' },
        { key: 'customer', label: 'Customer', type: 'text' },
      ],
      sections: [
        { id: 'intro', title: '1. Test Scope', type: 'static', template_content: '<p>Define what is being tested and acceptance criteria.</p>' },
        { id: 'prereqs', title: '2. Prerequisites', type: 'checklist' },
        { id: 'procedures', title: '3. Test Procedures', type: 'test_procedures', procedure_fields: ['step', 'action', 'expected_result', 'actual_result', 'pass_fail'] },
        { id: 'deviations', title: '4. Deviations & Observations', type: 'manual_table', columns: [
          { key: 'dev_id', label: 'ID', type: 'text' },
          { key: 'description', label: 'Description', type: 'text', editable: true },
          { key: 'severity', label: 'Severity', type: 'select', options: ['Minor', 'Major', 'Critical'] },
          { key: 'resolution', label: 'Resolution', type: 'text', editable: true },
          { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Resolved', 'Accepted'] },
        ]},
        { id: 'conclusion', title: '5. Test Conclusion', type: 'static', template_content: '<p>Overall test result: PASS / FAIL / PASS WITH DEVIATIONS</p>' },
        { id: 'approval', title: '6. Sign-off', type: 'signature_block', signatories: [
          { role: 'Test Engineer', required: true },
          { role: 'Quality Assurance', required: true },
          { role: 'Customer Witness', required: false },
        ]},
      ],
      revision_history: true,
    },
  },

  // ── INTERFACE CONTROL DOCUMENT ────────────────────────────
  {
    name: 'Interface Control Document',
    type: 'icd',
    category: 'architecture',
    description: 'Define all system interfaces — hardware, software, communication protocols and signal lists.',
    version: '1.0',
    schema: {
      metadata_fields: [
        { key: 'system_a', label: 'System A', type: 'text', required: true },
        { key: 'system_b', label: 'System B', type: 'text', required: true },
        { key: 'interface_type', label: 'Interface Type', type: 'select', options: ['Hardware', 'Software', 'Communication', 'Mixed'] },
      ],
      sections: [
        { id: 'overview', title: '1. Interface Overview', type: 'static', template_content: '<p>Describe the interface between the two systems.</p>' },
        { id: 'signals', title: '2. Signal List', type: 'manual_table', columns: [
          { key: 'signal_id', label: 'Signal ID', type: 'text' },
          { key: 'name', label: 'Signal Name', type: 'text', editable: true },
          { key: 'direction', label: 'Direction', type: 'select', options: ['A→B', 'B→A', 'Bidirectional'] },
          { key: 'type', label: 'Type', type: 'select', options: ['Digital', 'Analog', 'Serial', 'Ethernet', 'Bus'] },
          { key: 'description', label: 'Description', type: 'text', editable: true },
          { key: 'range', label: 'Range / Format', type: 'text', editable: true },
        ]},
        { id: 'protocols', title: '3. Communication Protocols', type: 'static', template_content: '<p>Define protocols, baud rates, message formats, etc.</p>' },
        { id: 'electrical', title: '4. Electrical Specifications', type: 'static', template_content: '<p>Voltage levels, connector types, cable specifications.</p>' },
        { id: 'refs', title: '5. References', type: 'reference_list' },
        { id: 'approval', title: '6. Approval', type: 'signature_block', signatories: [
          { role: 'System A Representative', required: true },
          { role: 'System B Representative', required: true },
        ]},
      ],
      revision_history: true,
    },
  },

  // ── SAT ───────────────────────────────────────────────────
  {
    name: 'Site Acceptance Test (SAT)',
    type: 'test_protocol',
    category: 'test',
    description: 'SAT protocol for on-site commissioning verification.',
    version: '1.0',
    schema: {
      metadata_fields: [
        { key: 'system_name', label: 'System Name', type: 'text', required: true },
        { key: 'vessel_name', label: 'Vessel / Site', type: 'text' },
        { key: 'test_date', label: 'Test Date', type: 'date' },
        { key: 'customer', label: 'Customer', type: 'text' },
      ],
      sections: [
        { id: 'intro', title: '1. Test Scope', type: 'static', template_content: '<p>Verify on-site installation and integration meets specifications.</p>' },
        { id: 'prereqs', title: '2. Prerequisites & Safety', type: 'checklist' },
        { id: 'procedures', title: '3. Site Test Procedures', type: 'test_procedures', procedure_fields: ['step', 'action', 'expected_result', 'actual_result', 'pass_fail'] },
        { id: 'punchlist', title: '4. Punch List', type: 'manual_table', columns: [
          { key: 'item_id', label: 'ID', type: 'text' },
          { key: 'description', label: 'Description', type: 'text', editable: true },
          { key: 'severity', label: 'Category', type: 'select', options: ['A - Blocking', 'B - Before Delivery', 'C - Observation'] },
          { key: 'responsible', label: 'Responsible', type: 'text', editable: true },
          { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Resolved', 'Accepted'] },
        ]},
        { id: 'conclusion', title: '5. Conclusion', type: 'static', template_content: '<p>System acceptance result.</p>' },
        { id: 'approval', title: '6. Sign-off', type: 'signature_block', signatories: [
          { role: 'Commissioning Engineer', required: true },
          { role: 'Customer Representative', required: true },
          { role: 'Class Surveyor', required: false },
        ]},
      ],
      revision_history: true,
    },
  },

  // ── ALARM LIST ────────────────────────────────────────────
  {
    name: 'Alarm & Event List',
    type: 'alarm_list',
    category: 'functional',
    description: 'Complete alarm and event listing with priorities, setpoints and actions.',
    version: '1.0',
    schema: {
      metadata_fields: [
        { key: 'system_name', label: 'System Name', type: 'text', required: true },
      ],
      sections: [
        { id: 'intro', title: '1. General', type: 'static', template_content: '<p>Alarm philosophy and priority definitions.</p>' },
        { id: 'alarms', title: '2. Alarm List', type: 'manual_table', columns: [
          { key: 'tag', label: 'Tag', type: 'text', editable: true },
          { key: 'description', label: 'Description', type: 'text', editable: true },
          { key: 'priority', label: 'Priority', type: 'select', options: ['Critical', 'High', 'Medium', 'Low', 'Event'] },
          { key: 'setpoint', label: 'Setpoint', type: 'text', editable: true },
          { key: 'delay', label: 'Delay (s)', type: 'number' },
          { key: 'action', label: 'Operator Action', type: 'text', editable: true },
          { key: 'consequence', label: 'Auto Action', type: 'text', editable: true },
        ]},
        { id: 'approval', title: '3. Approval', type: 'signature_block', signatories: [
          { role: 'Author', required: true },
          { role: 'Technical Reviewer', required: true },
        ]},
      ],
      revision_history: true,
    },
  },

];

// ═══════════════════════════════════════════════════════════
// SEED LOGIC
// ═══════════════════════════════════════════════════════════

async function seed() {
  console.log('🌱 Seeding document templates...\n');

  for (const tmpl of templates) {
    // Upsert: skip if name+type already exists
    const existing = await pool.query(
      'SELECT id FROM doc_templates WHERE name = $1 AND type = $2',
      [tmpl.name, tmpl.type]
    );

    if (existing.rows.length > 0) {
      console.log(`  ⏭  ${tmpl.name} (already exists)`);
      continue;
    }

    await pool.query(
      `INSERT INTO doc_templates (name, type, category, description, version, schema)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tmpl.name, tmpl.type, tmpl.category, tmpl.description, tmpl.version, JSON.stringify(tmpl.schema)]
    );
    console.log(`  ✅ ${tmpl.name}`);
  }

  console.log(`\n🎉 Done! ${templates.length} templates processed.`);
  pool.end();
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  pool.end();
  process.exit(1);
});
