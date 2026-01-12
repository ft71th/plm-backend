// index.js - Main server file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ============== AUTH ROUTES ==============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, role',
      [email, hashedPassword, name]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get all hardware types
app.get('/api/hardware-types', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hardware_types ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get hardware types error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new hardware type
app.post('/api/hardware-types', authenticateToken, async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    const result = await pool.query(
      'INSERT INTO hardware_types (name, icon, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, icon, description, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add hardware type error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update hardware type
app.put('/api/hardware-types/:id', authenticateToken, async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    const result = await pool.query(
      'UPDATE hardware_types SET name = $1, icon = $2, description = $3 WHERE id = $4 RETURNING *',
      [name, icon, description, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hardware type not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update hardware type error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Delete hardware type
app.delete('/api/hardware-types/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM hardware_types WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete hardware type error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== PROJECT ROUTES ==============

// Get all projects for user
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM nodes WHERE project_id = p.id) as node_count,
        (SELECT COUNT(*) FROM edges WHERE project_id = p.id) as edge_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.owner_id = $1 OR pm.user_id = $1
      ORDER BY p.updated_at DESC
    `, [req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create project
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name, description, version } = req.body;
    
    const result = await pool.query(
      'INSERT INTO projects (name, description, version, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || '', version || '1.0', req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single project with all data
app.get('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get nodes
    const nodesResult = await pool.query(
      'SELECT * FROM nodes WHERE project_id = $1',
      [id]
    );
    
    // Get edges
    const edgesResult = await pool.query(
      'SELECT * FROM edges WHERE project_id = $1',
      [id]
    );
    
    // Get whiteboards
    const whiteboardsResult = await pool.query(
      'SELECT * FROM whiteboards WHERE project_id = $1',
      [id]
    );
    
    // Transform nodes to ReactFlow format
    const nodes = nodesResult.rows.map(n => ({
      id: n.node_id,
      type: n.type,
      position: { x: n.position_x, y: n.position_y },
      data: n.data
    }));
    
    // Transform edges to ReactFlow format
    const edges = edgesResult.rows.map(e => ({
      id: e.edge_id,
      source: e.source,
      target: e.target,
      sourceHandle: e.source_handle,
      targetHandle: e.target_handle,
      type: e.type,
      data: e.data
    }));
    
    res.json({
      project: projectResult.rows[0],
      nodes,
      edges,
      whiteboards: whiteboardsResult.rows
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save project (full save)
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { name, description, version, nodes, edges, whiteboards } = req.body;
    
    await client.query('BEGIN');
    
    // Update project
    await client.query(
      'UPDATE projects SET name = $1, description = $2, version = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [name, description, version, id]
    );
    
    // Delete existing nodes and edges
    await client.query('DELETE FROM nodes WHERE project_id = $1', [id]);
    await client.query('DELETE FROM edges WHERE project_id = $1', [id]);
    await client.query('DELETE FROM whiteboards WHERE project_id = $1', [id]);
    
    // Insert nodes
    for (const node of nodes) {
      await client.query(
        'INSERT INTO nodes (project_id, node_id, type, position_x, position_y, data, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)',
        [id, node.id, node.type, node.position.x, node.position.y, node.data, req.user.id]
      );
    }
    
    // Insert edges
    for (const edge of edges) {
      await client.query(
        'INSERT INTO edges (project_id, edge_id, source, target, source_handle, target_handle, type, data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, edge.id, edge.source, edge.target, edge.sourceHandle, edge.targetHandle, edge.type, edge.data]
      );
    }
    
    // Insert whiteboards
    for (const wb of (whiteboards || [])) {
      await client.query(
        'INSERT INTO whiteboards (project_id, whiteboard_id, name, type, nodes, edges) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, wb.id, wb.name, wb.type, JSON.stringify(wb.nodes || []), JSON.stringify(wb.edges || [])]
      );
    }
    
    // Log activity
    await client.query(
      'INSERT INTO activity_log (project_id, user_id, action, changes) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, 'project_saved', { nodeCount: nodes.length, edgeCount: edges.length }]
    );
    
    await client.query('COMMIT');
    
    // Notify other users
    io.to(`project-${id}`).emit('project-updated', { userId: req.user.id });
    
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Save project error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Delete project
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check ownership
    const project = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [id]
    );
    
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (project.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== REAL-TIME COLLABORATION ==============

// Track active users per project
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  
  // Join project room
  socket.on('join-project', ({ projectId, user }) => {
    socket.join(`project-${projectId}`);
    
    // Track active user
    if (!activeUsers.has(projectId)) {
      activeUsers.set(projectId, new Map());
    }
    activeUsers.get(projectId).set(socket.id, user);
    
    // Notify others
    io.to(`project-${projectId}`).emit('user-joined', {
      users: Array.from(activeUsers.get(projectId).values())
    });
    
    console.log(`👤 ${user.name} joined project ${projectId}`);
  });
  
  // Leave project room
  socket.on('leave-project', ({ projectId }) => {
    socket.leave(`project-${projectId}`);
    
    if (activeUsers.has(projectId)) {
      activeUsers.get(projectId).delete(socket.id);
      
      io.to(`project-${projectId}`).emit('user-left', {
        users: Array.from(activeUsers.get(projectId).values())
      });
    }
  });
  
  // Node moved
  socket.on('node-moved', ({ projectId, nodeId, position }) => {
    socket.to(`project-${projectId}`).emit('node-moved', { nodeId, position });
  });
  
  // Node updated
  socket.on('node-updated', ({ projectId, nodeId, data }) => {
    socket.to(`project-${projectId}`).emit('node-updated', { nodeId, data });
  });
  
  // Node added
  socket.on('node-added', ({ projectId, node }) => {
    socket.to(`project-${projectId}`).emit('node-added', { node });
  });
  
  // Node deleted
  socket.on('node-deleted', ({ projectId, nodeId }) => {
    socket.to(`project-${projectId}`).emit('node-deleted', { nodeId });
  });
  
  // Edge added
  socket.on('edge-added', ({ projectId, edge }) => {
    socket.to(`project-${projectId}`).emit('edge-added', { edge });
  });
  
  // Edge deleted
  socket.on('edge-deleted', ({ projectId, edgeId }) => {
    socket.to(`project-${projectId}`).emit('edge-deleted', { edgeId });
  });
  
  // Cursor position (for showing other users' cursors)
  socket.on('cursor-move', ({ projectId, position, user }) => {
    socket.to(`project-${projectId}`).emit('cursor-move', { position, user, odocId: socket.id });
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
    
    // Remove from all projects
    activeUsers.forEach((users, projectId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        io.to(`project-${projectId}`).emit('user-left', {
          users: Array.from(users.values())
        });
      }
    });
  });
});

// ============== START SERVER ==============

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('');
  console.log('🚀 PLM Backend Server Running!');
  console.log(`📡 API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log('');
});