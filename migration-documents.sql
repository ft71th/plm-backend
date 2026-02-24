-- ═══════════════════════════════════════════════════════════
-- Northlight Document Engine — Database Migration
-- Run in plm_db:  psql -U postgres -d plm_db -f migration-documents.sql
-- ═══════════════════════════════════════════════════════════

-- Template library (global + company-specific)
CREATE TABLE IF NOT EXISTS doc_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  company_id UUID,
  version VARCHAR(50) DEFAULT '1.0',
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document instances (per project)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES doc_templates(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  doc_number VARCHAR(100),
  version VARCHAR(50) DEFAULT '1.0',
  status VARCHAR(50) DEFAULT 'draft',
  metadata JSONB DEFAULT '{}'::jsonb,
  section_data JSONB DEFAULT '{}'::jsonb,
  revision_log JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_template ON documents(template_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_doc_templates_type ON doc_templates(type);
CREATE INDEX IF NOT EXISTS idx_doc_templates_category ON doc_templates(category);

-- ═══════════════════════════════════════════════════════════
-- Seed: Standard templates
-- ═══════════════════════════════════════════════════════════

INSERT INTO doc_templates (name, type, category, description, version, schema)
VALUES
-- Requirements
('Customer Requirements Specification', 'req_specification', 'requirements',
 'Template for capturing and structuring customer requirements', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "system", "label": "System", "type": "text", "required": true},
     {"key": "customer", "label": "Customer", "type": "text"},
     {"key": "vessel", "label": "Vessel", "type": "text"},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Introduction", "type": "static", "template_content": "", "required": true},
     {"id": "s2", "title": "2. Scope", "type": "static", "template_content": ""},
     {"id": "s3", "title": "3. Reference Documents", "type": "reference_list"},
     {"id": "s4", "title": "4. General Requirements", "type": "dynamic_table", "data_source": "requirements", "filter": {"reqType": "customer"}, "columns": [
       {"key": "req_id", "label": "Req ID"},
       {"key": "title", "label": "Requirement"},
       {"key": "priority", "label": "Priority"},
       {"key": "status", "label": "Status"}
     ]},
     {"id": "s5", "title": "5. Functional Requirements", "type": "static", "template_content": ""},
     {"id": "s6", "title": "6. Non-Functional Requirements", "type": "static", "template_content": ""},
     {"id": "s7", "title": "7. Acceptance Criteria", "type": "static", "template_content": ""},
     {"id": "s8", "title": "8. Appendices", "type": "static", "template_content": ""}
   ],
   "header": {"fields": ["doc_number", "version", "date", "classification"]},
   "footer": {"fields": ["page_number", "doc_number"]},
   "revision_history": true
 }'::jsonb),

-- Architecture
('System Architecture Description', 'arch_system', 'architecture',
 'System architecture and platform description document', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "system", "label": "System", "type": "text", "required": true},
     {"key": "platform", "label": "Platform", "type": "text"},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Introduction", "type": "static", "template_content": ""},
     {"id": "s2", "title": "2. System Overview", "type": "static", "template_content": ""},
     {"id": "s3", "title": "3. Architecture Diagram", "type": "architecture_view"},
     {"id": "s4", "title": "4. Component Descriptions", "type": "component_list"},
     {"id": "s5", "title": "5. Communication Architecture", "type": "static", "template_content": ""},
     {"id": "s6", "title": "6. Interface Definitions", "type": "io_list"},
     {"id": "s7", "title": "7. Sequence Diagrams", "type": "sequence_embed"},
     {"id": "s8", "title": "8. Constraints & Limitations", "type": "static", "template_content": ""}
   ],
   "header": {"fields": ["doc_number", "version", "date", "classification"]},
   "footer": {"fields": ["page_number", "doc_number"]},
   "revision_history": true
 }'::jsonb),

-- Interface Control Document
('Interface Control Document', 'arch_interface', 'architecture',
 'Defines interfaces between systems or subsystems', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "system_a", "label": "System A", "type": "text", "required": true},
     {"key": "system_b", "label": "System B", "type": "text", "required": true},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Purpose", "type": "static", "template_content": ""},
     {"id": "s2", "title": "2. Interface Overview", "type": "static", "template_content": ""},
     {"id": "s3", "title": "3. Physical Interfaces", "type": "io_list"},
     {"id": "s4", "title": "4. Communication Protocol", "type": "static", "template_content": ""},
     {"id": "s5", "title": "5. Data Exchange", "type": "dynamic_table", "data_source": "manual", "columns": [
       {"key": "signal", "label": "Signal Name"},
       {"key": "direction", "label": "Direction", "type": "select", "options": ["A→B","B→A","Bidirectional"]},
       {"key": "type", "label": "Data Type"},
       {"key": "range", "label": "Range"},
       {"key": "update_rate", "label": "Update Rate"}
     ]},
     {"id": "s6", "title": "6. Sequence Diagrams", "type": "sequence_embed"},
     {"id": "s7", "title": "7. Error Handling", "type": "static", "template_content": ""}
   ],
   "header": {"fields": ["doc_number", "version", "date", "classification"]},
   "footer": {"fields": ["page_number", "doc_number"]},
   "revision_history": true
 }'::jsonb),

-- Standard / Procedure
('Standard Operating Procedure', 'std_procedure', 'standard',
 'Standard procedure or how-to document', '1.0',
 '{
   "metadata_fields": [
     {"key": "procedure_name", "label": "Procedure Name", "type": "text", "required": true},
     {"key": "department", "label": "Department", "type": "text"},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Purpose", "type": "static", "template_content": ""},
     {"id": "s2", "title": "2. Scope", "type": "static", "template_content": ""},
     {"id": "s3", "title": "3. References", "type": "reference_list"},
     {"id": "s4", "title": "4. Definitions", "type": "static", "template_content": ""},
     {"id": "s5", "title": "5. Procedure", "type": "static", "template_content": ""},
     {"id": "s6", "title": "6. Records", "type": "static", "template_content": ""},
     {"id": "s7", "title": "7. Appendices", "type": "static", "template_content": ""}
   ],
   "header": {"fields": ["doc_number", "version", "date"]},
   "footer": {"fields": ["page_number"]},
   "revision_history": true
 }'::jsonb),

-- FMEA Risk Analysis
('FMEA Risk Analysis', 'risk_fmea', 'risk',
 'Failure Mode and Effects Analysis', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "system", "label": "System/Subsystem", "type": "text", "required": true},
     {"key": "prepared_by", "label": "Prepared By", "type": "text"},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Introduction", "type": "static", "template_content": ""},
     {"id": "s2", "title": "2. Scope & Boundaries", "type": "static", "template_content": ""},
     {"id": "s3", "title": "3. FMEA Worksheet", "type": "risk_matrix", "columns": [
       {"key": "item", "label": "#", "auto_increment": true},
       {"key": "component", "label": "Component/Function"},
       {"key": "failure_mode", "label": "Potential Failure Mode"},
       {"key": "effect", "label": "Potential Effect"},
       {"key": "severity", "label": "S", "type": "number", "min": 1, "max": 10},
       {"key": "cause", "label": "Potential Cause"},
       {"key": "occurrence", "label": "O", "type": "number", "min": 1, "max": 10},
       {"key": "controls", "label": "Current Controls"},
       {"key": "detection", "label": "D", "type": "number", "min": 1, "max": 10},
       {"key": "rpn", "label": "RPN", "computed": "severity * occurrence * detection"},
       {"key": "action", "label": "Recommended Action"},
       {"key": "responsible", "label": "Responsible"},
       {"key": "status", "label": "Status", "type": "select", "options": ["Open","In Progress","Closed"]}
     ]},
     {"id": "s4", "title": "4. Risk Summary", "type": "static", "template_content": ""},
     {"id": "s5", "title": "5. Action Plan", "type": "static", "template_content": ""},
     {"id": "s6", "title": "6. Approval", "type": "signature_block", "signatories": [
       {"role": "FMEA Lead", "required": true},
       {"role": "Project Manager", "required": true},
       {"role": "Quality Assurance", "required": false}
     ]}
   ],
   "header": {"fields": ["doc_number", "version", "date", "classification"]},
   "footer": {"fields": ["page_number", "doc_number"]},
   "revision_history": true
 }'::jsonb),

-- Functional Description
('Functional Description', 'func_description', 'functional',
 'Describes system functionality and behavior', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "system", "label": "System", "type": "text", "required": true},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Introduction", "type": "static", "template_content": ""},
     {"id": "s2", "title": "2. System Overview", "type": "architecture_view"},
     {"id": "s3", "title": "3. Operating Modes", "type": "static", "template_content": ""},
     {"id": "s4", "title": "4. Function Descriptions", "type": "static", "template_content": ""},
     {"id": "s5", "title": "5. Sequences", "type": "sequence_embed"},
     {"id": "s6", "title": "6. Alarm & Event Handling", "type": "alarm_list"},
     {"id": "s7", "title": "7. I/O List", "type": "io_list"},
     {"id": "s8", "title": "8. HMI Description", "type": "static", "template_content": ""}
   ],
   "header": {"fields": ["doc_number", "version", "date", "classification"]},
   "footer": {"fields": ["page_number", "doc_number"]},
   "revision_history": true
 }'::jsonb),

-- Operator Manual
('Operator Manual', 'manual_operator', 'manual',
 'Operator manual for system operation', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "system", "label": "System", "type": "text", "required": true},
     {"key": "vessel", "label": "Vessel", "type": "text"},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Safety Information", "type": "static", "template_content": ""},
     {"id": "s2", "title": "2. System Overview", "type": "architecture_view"},
     {"id": "s3", "title": "3. Getting Started", "type": "static", "template_content": ""},
     {"id": "s4", "title": "4. Normal Operation", "type": "static", "template_content": ""},
     {"id": "s5", "title": "5. Alarm Handling", "type": "alarm_list"},
     {"id": "s6", "title": "6. Emergency Procedures", "type": "static", "template_content": ""},
     {"id": "s7", "title": "7. Maintenance", "type": "static", "template_content": ""},
     {"id": "s8", "title": "8. Troubleshooting", "type": "checklist"}
   ],
   "header": {"fields": ["doc_number", "version", "date"]},
   "footer": {"fields": ["page_number", "doc_number"]},
   "revision_history": true
 }'::jsonb),

-- FAT Protocol
('FAT Protocol', 'test_fat', 'test',
 'Factory Acceptance Test protocol', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "system", "label": "System", "type": "text", "required": true},
     {"key": "vessel", "label": "Vessel", "type": "text"},
     {"key": "customer", "label": "Customer", "type": "text"},
     {"key": "test_location", "label": "Test Location", "type": "text"},
     {"key": "test_date", "label": "Test Date", "type": "date"},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Purpose & Scope", "type": "static", "template_content": "", "required": true},
     {"id": "s2", "title": "2. Reference Documents", "type": "reference_list"},
     {"id": "s3", "title": "3. System Overview", "type": "static", "template_content": ""},
     {"id": "s4", "title": "4. Test Objects", "type": "dynamic_table", "data_source": "requirements", "filter": {"tags": ["testable"]}, "columns": [
       {"key": "req_id", "label": "Req ID"},
       {"key": "title", "label": "Requirement"},
       {"key": "priority", "label": "Priority"},
       {"key": "test_method", "label": "Method", "editable": true}
     ]},
     {"id": "s5", "title": "5. Test Procedures", "type": "test_procedures", "linked_to": "s4", "procedure_fields": ["precondition", "steps", "expected_result", "actual_result", "pass_fail"]},
     {"id": "s6", "title": "6. Sequence Verification", "type": "sequence_embed"},
     {"id": "s7", "title": "7. Punch List", "type": "dynamic_table", "data_source": "manual", "columns": [
       {"key": "item", "label": "#", "auto_increment": true},
       {"key": "description", "label": "Description"},
       {"key": "severity", "label": "Severity", "type": "select", "options": ["A","B","C"]},
       {"key": "responsible", "label": "Responsible"},
       {"key": "status", "label": "Status", "type": "select", "options": ["Open","Closed"]}
     ]},
     {"id": "s8", "title": "8. Test Summary", "type": "static", "template_content": ""},
     {"id": "s9", "title": "9. Acceptance & Signatures", "type": "signature_block", "signatories": [
       {"role": "Test Engineer", "required": true},
       {"role": "Customer Representative", "required": true},
       {"role": "Project Manager", "required": false}
     ]}
   ],
   "header": {"fields": ["doc_number", "version", "date", "classification"]},
   "footer": {"fields": ["page_number", "doc_number"]},
   "revision_history": true
 }'::jsonb),

-- HAT Protocol
('HAT Protocol', 'test_hat', 'test',
 'Harbor Acceptance Test protocol', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "system", "label": "System", "type": "text", "required": true},
     {"key": "vessel", "label": "Vessel", "type": "text", "required": true},
     {"key": "customer", "label": "Customer", "type": "text"},
     {"key": "harbor", "label": "Harbor/Location", "type": "text"},
     {"key": "test_date", "label": "Test Date", "type": "date"},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Purpose & Scope", "type": "static", "template_content": "", "required": true},
     {"id": "s2", "title": "2. Reference Documents", "type": "reference_list"},
     {"id": "s3", "title": "3. Prerequisites", "type": "checklist"},
     {"id": "s4", "title": "4. Test Procedures", "type": "test_procedures", "procedure_fields": ["precondition", "steps", "expected_result", "actual_result", "pass_fail"]},
     {"id": "s5", "title": "5. Punch List", "type": "dynamic_table", "data_source": "manual", "columns": [
       {"key": "item", "label": "#", "auto_increment": true},
       {"key": "description", "label": "Description"},
       {"key": "severity", "label": "Severity", "type": "select", "options": ["A","B","C"]},
       {"key": "responsible", "label": "Responsible"},
       {"key": "status", "label": "Status", "type": "select", "options": ["Open","Closed"]}
     ]},
     {"id": "s6", "title": "6. Test Summary", "type": "static", "template_content": ""},
     {"id": "s7", "title": "7. Acceptance & Signatures", "type": "signature_block", "signatories": [
       {"role": "Test Engineer", "required": true},
       {"role": "Customer Representative", "required": true},
       {"role": "Classification Society", "required": false},
       {"role": "Project Manager", "required": false}
     ]}
   ],
   "header": {"fields": ["doc_number", "version", "date", "classification"]},
   "footer": {"fields": ["page_number", "doc_number"]},
   "revision_history": true
 }'::jsonb),

-- SAT Protocol
('SAT Protocol', 'test_sat', 'test',
 'Sea Acceptance Test protocol', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "system", "label": "System", "type": "text", "required": true},
     {"key": "vessel", "label": "Vessel", "type": "text", "required": true},
     {"key": "customer", "label": "Customer", "type": "text"},
     {"key": "sea_area", "label": "Sea Trial Area", "type": "text"},
     {"key": "test_date", "label": "Test Date", "type": "date"},
     {"key": "weather_conditions", "label": "Weather Conditions", "type": "text"},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Purpose & Scope", "type": "static", "template_content": "", "required": true},
     {"id": "s2", "title": "2. Reference Documents", "type": "reference_list"},
     {"id": "s3", "title": "3. Sea Trial Conditions", "type": "static", "template_content": ""},
     {"id": "s4", "title": "4. Prerequisites", "type": "checklist"},
     {"id": "s5", "title": "5. Test Procedures", "type": "test_procedures", "procedure_fields": ["precondition", "steps", "expected_result", "actual_result", "pass_fail"]},
     {"id": "s6", "title": "6. Performance Data", "type": "dynamic_table", "data_source": "manual", "columns": [
       {"key": "parameter", "label": "Parameter"},
       {"key": "expected", "label": "Expected Value"},
       {"key": "measured", "label": "Measured Value"},
       {"key": "unit", "label": "Unit"},
       {"key": "pass_fail", "label": "Pass/Fail", "type": "select", "options": ["Pass","Fail","N/A"]}
     ]},
     {"id": "s7", "title": "7. Punch List", "type": "dynamic_table", "data_source": "manual", "columns": [
       {"key": "item", "label": "#", "auto_increment": true},
       {"key": "description", "label": "Description"},
       {"key": "severity", "label": "Severity", "type": "select", "options": ["A","B","C"]},
       {"key": "responsible", "label": "Responsible"},
       {"key": "status", "label": "Status", "type": "select", "options": ["Open","Closed"]}
     ]},
     {"id": "s8", "title": "8. Test Summary", "type": "static", "template_content": ""},
     {"id": "s9", "title": "9. Acceptance & Signatures", "type": "signature_block", "signatories": [
       {"role": "Test Engineer", "required": true},
       {"role": "Customer Representative", "required": true},
       {"role": "Captain/Chief Engineer", "required": true},
       {"role": "Classification Society", "required": false}
     ]}
   ],
   "header": {"fields": ["doc_number", "version", "date", "classification"]},
   "footer": {"fields": ["page_number", "doc_number"]},
   "revision_history": true
 }'::jsonb),

-- Unit Test Specification
('Unit Test Specification', 'test_unit', 'test',
 'Unit test specification for individual components', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "component", "label": "Component/Module", "type": "text", "required": true},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Introduction", "type": "static", "template_content": ""},
     {"id": "s2", "title": "2. Test Environment", "type": "static", "template_content": ""},
     {"id": "s3", "title": "3. Test Cases", "type": "test_procedures", "procedure_fields": ["precondition", "steps", "expected_result", "actual_result", "pass_fail"]},
     {"id": "s4", "title": "4. Test Results Summary", "type": "static", "template_content": ""},
     {"id": "s5", "title": "5. Approval", "type": "signature_block", "signatories": [
       {"role": "Developer", "required": true},
       {"role": "Reviewer", "required": true}
     ]}
   ],
   "header": {"fields": ["doc_number", "version", "date"]},
   "footer": {"fields": ["page_number"]},
   "revision_history": true
 }'::jsonb),

-- Functional Test Specification
('Functional Test Specification', 'test_functional', 'test',
 'Functional test specification for system functions', '1.0',
 '{
   "metadata_fields": [
     {"key": "project_name", "label": "Project Name", "type": "text", "required": true},
     {"key": "system", "label": "System", "type": "text", "required": true},
     {"key": "classification", "label": "Classification", "type": "select", "options": ["Confidential","Internal","Public"]}
   ],
   "sections": [
     {"id": "s1", "title": "1. Introduction", "type": "static", "template_content": ""},
     {"id": "s2", "title": "2. Scope", "type": "static", "template_content": ""},
     {"id": "s3", "title": "3. Test Objects", "type": "dynamic_table", "data_source": "requirements", "filter": {"reqType": "project"}, "columns": [
       {"key": "req_id", "label": "Req ID"},
       {"key": "title", "label": "Requirement"},
       {"key": "priority", "label": "Priority"}
     ]},
     {"id": "s4", "title": "4. Test Procedures", "type": "test_procedures", "linked_to": "s3", "procedure_fields": ["precondition", "steps", "expected_result", "actual_result", "pass_fail"]},
     {"id": "s5", "title": "5. Test Summary", "type": "static", "template_content": ""},
     {"id": "s6", "title": "6. Approval", "type": "signature_block", "signatories": [
       {"role": "Test Engineer", "required": true},
       {"role": "Project Manager", "required": true}
     ]}
   ],
   "header": {"fields": ["doc_number", "version", "date", "classification"]},
   "footer": {"fields": ["page_number", "doc_number"]},
   "revision_history": true
 }'::jsonb)

ON CONFLICT DO NOTHING;

SELECT 'Document engine migration complete — ' || count(*) || ' templates seeded' AS status
FROM doc_templates;
