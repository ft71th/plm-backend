// routes/documents.js - Document Engine API routes
// Templates (global) + Documents (per project)

module.exports = function(pool, authenticateToken) {

  const router = require('express').Router();

  // ═══════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════

  // GET /api/doc-templates — list all templates (global + user's company)
  router.get('/doc-templates', authenticateToken, async (req, res) => {
    try {
      const { category } = req.query;
      let query = 'SELECT * FROM doc_templates';
      const params = [];
      
      if (category) {
        query += ' WHERE category = $1';
        params.push(category);
      }
      
      query += ' ORDER BY category, name';
      const result = await pool.query(query, params);
      res.json({ templates: result.rows });
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/doc-templates/:id — get single template
  router.get('/doc-templates/:id', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM doc_templates WHERE id = $1',
        [req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json({ template: result.rows[0] });
    } catch (error) {
      console.error('Get template error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // POST /api/doc-templates — create custom template
  router.post('/doc-templates', authenticateToken, async (req, res) => {
    try {
      const { name, type, category, description, schema, company_id } = req.body;
      const result = await pool.query(
        `INSERT INTO doc_templates (name, type, category, description, schema, company_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, type, category, description || '', JSON.stringify(schema), company_id || null, req.user.id]
      );
      res.json({ template: result.rows[0] });
    } catch (error) {
      console.error('Create template error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PUT /api/doc-templates/:id — update template
  router.put('/doc-templates/:id', authenticateToken, async (req, res) => {
    try {
      const { name, description, schema, version } = req.body;
      const result = await pool.query(
        `UPDATE doc_templates 
         SET name = COALESCE($1, name), 
             description = COALESCE($2, description),
             schema = COALESCE($3, schema),
             version = COALESCE($4, version),
             updated_at = NOW()
         WHERE id = $5 RETURNING *`,
        [name, description, schema ? JSON.stringify(schema) : null, version, req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json({ template: result.rows[0] });
    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // DELETE /api/doc-templates/:id — delete custom template
  router.delete('/doc-templates/:id', authenticateToken, async (req, res) => {
    try {
      // Only allow deleting non-standard templates (those with a created_by)
      const result = await pool.query(
        'DELETE FROM doc_templates WHERE id = $1 AND created_by IS NOT NULL RETURNING id',
        [req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Cannot delete standard templates' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // POST /api/doc-templates/:id/clone — clone template for customization
  router.post('/doc-templates/:id/clone', authenticateToken, async (req, res) => {
    try {
      const { name } = req.body;
      const source = await pool.query('SELECT * FROM doc_templates WHERE id = $1', [req.params.id]);
      if (source.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }
      const t = source.rows[0];
      const result = await pool.query(
        `INSERT INTO doc_templates (name, type, category, description, schema, company_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name || `${t.name} (Copy)`, t.type, t.category, t.description, JSON.stringify(t.schema), t.company_id, req.user.id]
      );
      res.json({ template: result.rows[0] });
    } catch (error) {
      console.error('Clone template error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // DOCUMENTS (per project)
  // ═══════════════════════════════════════════════════════════

  // GET /api/projects/:id/documents — list project documents
  router.get('/projects/:id/documents', authenticateToken, async (req, res) => {
    try {
      const { status, category } = req.query;
      let query = `
        SELECT d.*, dt.name as template_name, dt.type as template_type, dt.category as template_category
        FROM documents d
        LEFT JOIN doc_templates dt ON d.template_id = dt.id
        WHERE d.project_id = $1
      `;
      const params = [req.params.id];
      let idx = 2;

      if (status) {
        query += ` AND d.status = $${idx}`;
        params.push(status);
        idx++;
      }

      query += ' ORDER BY d.updated_at DESC';
      const result = await pool.query(query, params);
      res.json({ documents: result.rows });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/projects/:projectId/documents/:docId — get single document
  router.get('/projects/:projectId/documents/:docId', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT d.*, dt.name as template_name, dt.type as template_type, 
                dt.category as template_category, dt.schema as template_schema
         FROM documents d
         LEFT JOIN doc_templates dt ON d.template_id = dt.id
         WHERE d.id = $1 AND d.project_id = $2`,
        [req.params.docId, req.params.projectId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.json({ document: result.rows[0] });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // POST /api/projects/:id/documents — create document from template
  router.post('/projects/:id/documents', authenticateToken, async (req, res) => {
    try {
      const { template_id, title, doc_number, metadata } = req.body;

      // Get template to initialize section_data
      let initialSectionData = {};
      if (template_id) {
        const tmpl = await pool.query('SELECT schema FROM doc_templates WHERE id = $1', [template_id]);
        if (tmpl.rows.length > 0) {
          const schema = tmpl.rows[0].schema;
          // Initialize each section with empty data
          (schema.sections || []).forEach(s => {
            if (s.type === 'static') {
              initialSectionData[s.id] = { content: s.template_content || '' };
            } else if (s.type === 'dynamic_table' && s.data_source === 'manual') {
              initialSectionData[s.id] = { rows: [] };
            } else if (s.type === 'risk_matrix') {
              initialSectionData[s.id] = { rows: [] };
            } else if (s.type === 'test_procedures') {
              initialSectionData[s.id] = { procedures: [] };
            } else if (s.type === 'checklist') {
              initialSectionData[s.id] = { items: [] };
            } else if (s.type === 'signature_block') {
              initialSectionData[s.id] = {
                signatures: (s.signatories || []).map(sig => ({
                  role: sig.role, name: '', date: null, signed: false
                }))
              };
            } else if (s.type === 'reference_list') {
              initialSectionData[s.id] = { references: [] };
            }
          });
        }
      }

      // Auto-generate doc number if not provided
      const finalDocNumber = doc_number || await generateDocNumber(pool, req.params.id, template_id);

      const result = await pool.query(
        `INSERT INTO documents (template_id, project_id, title, doc_number, metadata, section_data, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          template_id, req.params.id, title, finalDocNumber,
          JSON.stringify(metadata || {}),
          JSON.stringify(initialSectionData),
          req.user.id
        ]
      );
      res.json({ document: result.rows[0] });
    } catch (error) {
      console.error('Create document error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PUT /api/projects/:projectId/documents/:docId — update document
  router.put('/projects/:projectId/documents/:docId', authenticateToken, async (req, res) => {
    try {
      const { title, doc_number, version, status, metadata, section_data, revision_log } = req.body;

      const updates = ['updated_at = NOW()'];
      const values = [];
      let idx = 1;

      if (title !== undefined) { updates.push(`title = $${idx}`); values.push(title); idx++; }
      if (doc_number !== undefined) { updates.push(`doc_number = $${idx}`); values.push(doc_number); idx++; }
      if (version !== undefined) { updates.push(`version = $${idx}`); values.push(version); idx++; }
      if (status !== undefined) { updates.push(`status = $${idx}`); values.push(status); idx++; }
      if (metadata !== undefined) { updates.push(`metadata = $${idx}`); values.push(JSON.stringify(metadata)); idx++; }
      if (section_data !== undefined) { updates.push(`section_data = $${idx}`); values.push(JSON.stringify(section_data)); idx++; }
      if (revision_log !== undefined) { updates.push(`revision_log = $${idx}`); values.push(JSON.stringify(revision_log)); idx++; }

      values.push(req.params.docId);
      values.push(req.params.projectId);

      const result = await pool.query(
        `UPDATE documents SET ${updates.join(', ')} WHERE id = $${idx} AND project_id = $${idx + 1} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.json({ document: result.rows[0] });
    } catch (error) {
      console.error('Update document error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // DELETE /api/projects/:projectId/documents/:docId
  router.delete('/projects/:projectId/documents/:docId', authenticateToken, async (req, res) => {
    try {
      await pool.query(
        'DELETE FROM documents WHERE id = $1 AND project_id = $2',
        [req.params.docId, req.params.projectId]
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // POST /api/projects/:projectId/documents/:docId/new-version — create new version
  router.post('/projects/:projectId/documents/:docId/new-version', authenticateToken, async (req, res) => {
    try {
      const source = await pool.query(
        'SELECT * FROM documents WHERE id = $1 AND project_id = $2',
        [req.params.docId, req.params.projectId]
      );
      if (source.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const doc = source.rows[0];
      
      // Increment version
      const parts = (doc.version || '1.0').split('.');
      const newVersion = `${parts[0]}.${parseInt(parts[1] || 0) + 1}`;

      // Add to revision log
      const revLog = doc.revision_log || [];
      revLog.push({
        version: doc.version,
        date: new Date().toISOString().split('T')[0],
        author: req.user.email,
        changes: req.body.changes || 'New version created'
      });

      const result = await pool.query(
        `INSERT INTO documents (template_id, project_id, title, doc_number, version, status, metadata, section_data, revision_log, created_by)
         VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9) RETURNING *`,
        [
          doc.template_id, doc.project_id, doc.title, doc.doc_number,
          newVersion, JSON.stringify(doc.metadata),
          JSON.stringify(doc.section_data), JSON.stringify(revLog),
          req.user.id
        ]
      );
      res.json({ document: result.rows[0] });
    } catch (error) {
      console.error('New version error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};

// Helper: auto-generate document number
async function generateDocNumber(pool, projectId, templateId) {
  try {
    let prefix = 'DOC';
    if (templateId) {
      const tmpl = await pool.query('SELECT type FROM doc_templates WHERE id = $1', [templateId]);
      if (tmpl.rows.length > 0) {
        const typeMap = {
          'req_specification': 'REQ', 'req_internal': 'REQ',
          'arch_system': 'ARC', 'arch_platform': 'ARC', 'arch_interface': 'ICD',
          'std_procedure': 'SOP', 'std_howto': 'HTO', 'std_guideline': 'GDL',
          'risk_fmea': 'FMEA', 'risk_hazop': 'HAZOP',
          'func_description': 'FD',
          'manual_operator': 'OM',
          'test_unit': 'UT', 'test_functional': 'FT',
          'test_fat': 'FAT', 'test_hat': 'HAT', 'test_sat': 'SAT',
        };
        prefix = typeMap[tmpl.rows[0].type] || 'DOC';
      }
    }
    
    // Count existing docs of same type in project
    const count = await pool.query(
      'SELECT COUNT(*) FROM documents WHERE project_id = $1 AND doc_number LIKE $2',
      [projectId, `${prefix}-%`]
    );
    const seq = (parseInt(count.rows[0].count) + 1).toString().padStart(3, '0');
    return `${prefix}-${seq}`;
  } catch {
    return `DOC-${Date.now().toString(36).toUpperCase()}`;
  }
}
