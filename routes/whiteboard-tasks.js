// routes/whiteboard-tasks.js - API routes for whiteboard & task persistence
// Replaces localStorage with PostgreSQL storage

module.exports = function(pool, authenticateToken) {

  const router = require('express').Router();

  // ============== WHITEBOARD DATA ==============

  // GET /api/projects/:id/whiteboard
  router.get('/projects/:id/whiteboard', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT data, updated_at FROM whiteboard_data WHERE project_id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.json({ data: null, updated_at: null });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get whiteboard error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PUT /api/projects/:id/whiteboard
  router.put('/projects/:id/whiteboard', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { data } = req.body;

      await pool.query(`
        INSERT INTO whiteboard_data (project_id, data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (project_id)
        DO UPDATE SET data = $2, updated_at = NOW()
      `, [id, JSON.stringify(data)]);

      res.json({ success: true });
    } catch (error) {
      console.error('Save whiteboard error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ============== TASK BOARDS ==============

  // GET /api/projects/:id/boards
  router.get('/projects/:id/boards', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT data, updated_at FROM task_boards WHERE project_id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.json({ data: [], updated_at: null });
      }
      // data is stored as JSONB, postgres returns it parsed
      res.json({ data: result.rows[0].data, updated_at: result.rows[0].updated_at });
    } catch (error) {
      console.error('Get boards error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PUT /api/projects/:id/boards
  router.put('/projects/:id/boards', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { data } = req.body;

      await pool.query(`
        INSERT INTO task_boards (project_id, data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (project_id)
        DO UPDATE SET data = $2, updated_at = NOW()
      `, [id, JSON.stringify(data)]);

      res.json({ success: true });
    } catch (error) {
      console.error('Save boards error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ============== TASKS ==============

  // GET /api/projects/:id/tasks
  router.get('/projects/:id/tasks', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT data, updated_at FROM task_items WHERE project_id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.json({ data: [], updated_at: null });
      }
      res.json({ data: result.rows[0].data, updated_at: result.rows[0].updated_at });
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PUT /api/projects/:id/tasks
  router.put('/projects/:id/tasks', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { data } = req.body;

      await pool.query(`
        INSERT INTO task_items (project_id, data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (project_id)
        DO UPDATE SET data = $2, updated_at = NOW()
      `, [id, JSON.stringify(data)]);

      res.json({ success: true });
    } catch (error) {
      console.error('Save tasks error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ============== GANTT / TIMELINE ==============

  // GET /api/projects/:id/gantt
  router.get('/projects/:id/gantt', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT data, updated_at FROM gantt_data WHERE project_id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.json({ data: null, updated_at: null });
      }
      res.json({ data: result.rows[0].data, updated_at: result.rows[0].updated_at });
    } catch (error) {
      console.error('Get gantt error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PUT /api/projects/:id/gantt
  router.put('/projects/:id/gantt', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { data } = req.body;

      await pool.query(`
        INSERT INTO gantt_data (project_id, data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (project_id)
        DO UPDATE SET data = $2, updated_at = NOW()
      `, [id, JSON.stringify(data)]);

      res.json({ success: true });
    } catch (error) {
      console.error('Save gantt error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ============== MIGRATION ENDPOINT ==============
  // POST /api/projects/:id/migrate-local-data
  // One-time import of localStorage data to backend
  router.post('/projects/:id/migrate-local-data', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { whiteboard, boards, tasks, gantt } = req.body;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        if (whiteboard) {
          await client.query(`
            INSERT INTO whiteboard_data (project_id, data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (project_id) DO UPDATE SET data = $2, updated_at = NOW()
          `, [id, JSON.stringify(whiteboard)]);
        }

        if (boards) {
          await client.query(`
            INSERT INTO task_boards (project_id, data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (project_id) DO UPDATE SET data = $2, updated_at = NOW()
          `, [id, JSON.stringify(boards)]);
        }

        if (tasks) {
          await client.query(`
            INSERT INTO task_items (project_id, data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (project_id) DO UPDATE SET data = $2, updated_at = NOW()
          `, [id, JSON.stringify(tasks)]);
        }

        if (gantt) {
          await client.query(`
            INSERT INTO gantt_data (project_id, data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (project_id) DO UPDATE SET data = $2, updated_at = NOW()
          `, [id, JSON.stringify(gantt)]);
        }

        await client.query('COMMIT');
        res.json({ success: true, migrated: { whiteboard: !!whiteboard, boards: !!boards, tasks: !!tasks, gantt: !!gantt } });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
