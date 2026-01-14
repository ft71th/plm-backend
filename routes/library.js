// =====================================================
// Component Library Routes
// File: routes/library.js
// =====================================================

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Middleware to verify JWT token (use your existing auth middleware)
const authenticateToken = require('../middleware/auth');

module.exports = (pool) => {
  
  // ==========================================
  // GET /api/library
  // Get all library items with their versions
  // ==========================================
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const { type, search, tags } = req.query;
      
      let query = `
        SELECT 
          li.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', lv.id,
                'version', lv.version,
                'branch', lv.branch,
                'parentVersion', lv.parent_version_id,
                'data', lv.node_data,
                'changelog', lv.changelog,
                'state', lv.state,
                'createdBy', lv.created_by,
                'createdAt', lv.created_at
              ) ORDER BY lv.created_at DESC
            ) FILTER (WHERE lv.id IS NOT NULL),
            '[]'
          ) as versions,
          (SELECT COUNT(*) FROM library_usage WHERE library_item_id = li.id) as usage_count
        FROM library_items li
        LEFT JOIN library_versions lv ON lv.library_item_id = li.id
        WHERE li.is_deleted = FALSE
      `;
      
      const params = [];
      let paramIndex = 1;
      
      // Filter by type
      if (type) {
        query += ` AND li.type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }
      
      // Search by name/description
      if (search) {
        query += ` AND (
          li.name ILIKE $${paramIndex} 
          OR li.description ILIKE $${paramIndex}
          OR $${paramIndex + 1} = ANY(li.tags)
        )`;
        params.push(`%${search}%`, search.toLowerCase());
        paramIndex += 2;
      }
      
      // Filter by tags
      if (tags) {
        const tagArray = tags.split(',').map(t => t.trim().toLowerCase());
        query += ` AND li.tags && $${paramIndex}::text[]`;
        params.push(tagArray);
        paramIndex++;
      }
      
      query += `
        GROUP BY li.id
        ORDER BY li.updated_at DESC
      `;
      
      const result = await pool.query(query, params);
      
      // Transform to frontend format
      const items = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        tags: row.tags || [],
        owner: row.owner,
        currentVersion: row.current_version,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        versions: row.versions,
        usageCount: parseInt(row.usage_count) || 0,
      }));
      
      res.json(items);
    } catch (error) {
      console.error('Error fetching library items:', error);
      res.status(500).json({ error: 'Failed to fetch library items' });
    }
  });

  // ==========================================
  // GET /api/library/:id
  // Get a single library item with all versions
  // ==========================================
  router.get('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      const itemResult = await pool.query(
        'SELECT * FROM library_items WHERE id = $1 AND is_deleted = FALSE',
        [id]
      );
      
      if (itemResult.rows.length === 0) {
        return res.status(404).json({ error: 'Library item not found' });
      }
      
      const versionsResult = await pool.query(
        `SELECT * FROM library_versions 
         WHERE library_item_id = $1 
         ORDER BY created_at DESC`,
        [id]
      );
      
      const usageResult = await pool.query(
        `SELECT lu.*, p.name as project_name 
         FROM library_usage lu
         JOIN projects p ON p.id = lu.project_id
         WHERE lu.library_item_id = $1`,
        [id]
      );
      
      const item = itemResult.rows[0];
      res.json({
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        tags: item.tags || [],
        owner: item.owner,
        currentVersion: item.current_version,
        createdBy: item.created_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        versions: versionsResult.rows.map(v => ({
          id: v.id,
          version: v.version,
          branch: v.branch,
          parentVersion: v.parent_version_id,
          data: v.node_data,
          changelog: v.changelog,
          state: v.state,
          createdBy: v.created_by,
          createdAt: v.created_at,
        })),
        usage: usageResult.rows.map(u => ({
          projectId: u.project_id,
          projectName: u.project_name,
          nodeId: u.node_id,
          versionId: u.version_id,
          useLatest: u.use_latest,
        })),
      });
    } catch (error) {
      console.error('Error fetching library item:', error);
      res.status(500).json({ error: 'Failed to fetch library item' });
    }
  });

  // ==========================================
  // POST /api/library
  // Create a new library item with initial version
  // ==========================================
  router.post('/', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { 
        name, 
        description, 
        type, 
        tags, 
        owner,
        nodeData,      // The node data to save
        changelog,
      } = req.body;
      
      const userId = req.user?.id || null;
      
      // Create library item
      const itemResult = await client.query(
        `INSERT INTO library_items (name, description, type, tags, owner, current_version, created_by)
         VALUES ($1, $2, $3, $4, $5, '1.0', $6)
         RETURNING *`,
        [name, description, type, tags || [], owner, userId]
      );
      
      const libraryItem = itemResult.rows[0];
      
      // Create initial version
      const versionResult = await client.query(
        `INSERT INTO library_versions (library_item_id, version, branch, node_data, changelog, state, created_by)
         VALUES ($1, '1.0', 'main', $2, $3, 'released', $4)
         RETURNING *`,
        [libraryItem.id, nodeData, changelog || 'Initial version', userId]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        id: libraryItem.id,
        name: libraryItem.name,
        description: libraryItem.description,
        type: libraryItem.type,
        tags: libraryItem.tags || [],
        owner: libraryItem.owner,
        currentVersion: libraryItem.current_version,
        createdBy: libraryItem.created_by,
        createdAt: libraryItem.created_at,
        versions: [{
          id: versionResult.rows[0].id,
          version: '1.0',
          branch: 'main',
          parentVersion: null,
          data: versionResult.rows[0].node_data,
          changelog: versionResult.rows[0].changelog,
          state: 'released',
          createdBy: userId,
          createdAt: versionResult.rows[0].created_at,
        }],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating library item:', error);
      res.status(500).json({ error: 'Failed to create library item' });
    } finally {
      client.release();
    }
  });

  // ==========================================
  // POST /api/library/:id/versions
  // Create a new version of an existing library item
  // ==========================================
  router.post('/:id/versions', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { 
        nodeData, 
        changelog, 
        branch = 'main',
        state = 'released',
      } = req.body;
      
      const userId = req.user?.id || null;
      
      // Get current version to calculate next
      const itemResult = await client.query(
        'SELECT * FROM library_items WHERE id = $1 AND is_deleted = FALSE',
        [id]
      );
      
      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Library item not found' });
      }
      
      const item = itemResult.rows[0];
      
      // Get all versions to calculate next version number
      const versionsResult = await client.query(
        `SELECT version FROM library_versions 
         WHERE library_item_id = $1 AND branch = $2
         ORDER BY created_at DESC`,
        [id, branch]
      );
      
      // Calculate next version
      let nextVersion = '1.0';
      if (versionsResult.rows.length > 0) {
        const versions = versionsResult.rows.map(v => parseFloat(v.version));
        nextVersion = (Math.max(...versions) + 0.1).toFixed(1);
      }
      
      // Get parent version ID
      const parentVersionResult = await client.query(
        `SELECT id FROM library_versions 
         WHERE library_item_id = $1 AND version = $2 AND branch = $3`,
        [id, item.current_version, branch]
      );
      const parentVersionId = parentVersionResult.rows[0]?.id || null;
      
      // Create new version
      const versionResult = await client.query(
        `INSERT INTO library_versions 
         (library_item_id, version, branch, parent_version_id, node_data, changelog, state, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, nextVersion, branch, parentVersionId, nodeData, changelog, state, userId]
      );
      
      // Update current version on main branch
      if (branch === 'main') {
        await client.query(
          `UPDATE library_items SET current_version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [nextVersion, id]
        );
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        id: versionResult.rows[0].id,
        version: nextVersion,
        branch,
        parentVersion: parentVersionId,
        data: nodeData,
        changelog,
        state,
        createdBy: userId,
        createdAt: versionResult.rows[0].created_at,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating version:', error);
      res.status(500).json({ error: 'Failed to create version' });
    } finally {
      client.release();
    }
  });

  // ==========================================
  // PUT /api/library/:id
  // Update library item metadata (not versions)
  // ==========================================
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, tags, owner } = req.body;
      
      const result = await pool.query(
        `UPDATE library_items 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             tags = COALESCE($3, tags),
             owner = COALESCE($4, owner),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND is_deleted = FALSE
         RETURNING *`,
        [name, description, tags, owner, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Library item not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating library item:', error);
      res.status(500).json({ error: 'Failed to update library item' });
    }
  });

  // ==========================================
  // DELETE /api/library/:id
  // Soft delete a library item
  // ==========================================
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if item is in use
      const usageResult = await pool.query(
        'SELECT COUNT(*) FROM library_usage WHERE library_item_id = $1',
        [id]
      );
      
      if (parseInt(usageResult.rows[0].count) > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete library item that is in use by projects',
          usageCount: parseInt(usageResult.rows[0].count),
        });
      }
      
      const result = await pool.query(
        `UPDATE library_items SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_deleted = FALSE
         RETURNING id`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Library item not found' });
      }
      
      res.json({ success: true, id });
    } catch (error) {
      console.error('Error deleting library item:', error);
      res.status(500).json({ error: 'Failed to delete library item' });
    }
  });

  // ==========================================
  // POST /api/library/usage
  // Track when a library item is added to a project
  // ==========================================
  router.post('/usage', authenticateToken, async (req, res) => {
    try {
      const { projectId, libraryItemId, versionId, nodeId, useLatest } = req.body;
      
      const result = await pool.query(
        `INSERT INTO library_usage (project_id, library_item_id, version_id, node_id, use_latest)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (project_id, node_id) 
         DO UPDATE SET version_id = $3, use_latest = $5
         RETURNING *`,
        [projectId, libraryItemId, versionId, nodeId, useLatest || false]
      );
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error tracking library usage:', error);
      res.status(500).json({ error: 'Failed to track library usage' });
    }
  });

  // ==========================================
  // GET /api/library/usage/:projectId
  // Get all library references for a project
  // ==========================================
  router.get('/usage/:projectId', authenticateToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      
      const result = await pool.query(
        `SELECT 
          lu.*,
          li.name as library_item_name,
          li.current_version as latest_version,
          lv.version as used_version,
          lv.node_data
         FROM library_usage lu
         JOIN library_items li ON li.id = lu.library_item_id
         JOIN library_versions lv ON lv.id = lu.version_id
         WHERE lu.project_id = $1`,
        [projectId]
      );
      
      res.json(result.rows.map(row => ({
        nodeId: row.node_id,
        libraryItemId: row.library_item_id,
        libraryItemName: row.library_item_name,
        versionId: row.version_id,
        version: row.used_version,
        latestVersion: row.latest_version,
        useLatest: row.use_latest,
        nodeData: row.node_data,
        hasUpdate: row.used_version !== row.latest_version,
      })));
    } catch (error) {
      console.error('Error fetching library usage:', error);
      res.status(500).json({ error: 'Failed to fetch library usage' });
    }
  });

  // ==========================================
  // GET /api/library/search
  // Full-text search across library
  // ==========================================
  router.get('/search', authenticateToken, async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.json([]);
      }
      
      const result = await pool.query(
        `SELECT 
          li.id, li.name, li.type, li.current_version, li.description,
          ts_rank(to_tsvector('english', li.name || ' ' || COALESCE(li.description, '')), 
                  plainto_tsquery('english', $1)) as rank
         FROM library_items li
         WHERE li.is_deleted = FALSE
           AND (
             li.name ILIKE $2
             OR li.description ILIKE $2
             OR to_tsvector('english', li.name || ' ' || COALESCE(li.description, '')) 
                @@ plainto_tsquery('english', $1)
           )
         ORDER BY rank DESC, li.name
         LIMIT 20`,
        [q, `%${q}%`]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error searching library:', error);
      res.status(500).json({ error: 'Failed to search library' });
    }
  });

  return router;
};
