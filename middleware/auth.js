// =====================================================
// Authentication Middleware
// File: middleware/auth.js
// =====================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to verify JWT token from Authorization header
 * Usage: router.get('/protected', authenticateToken, handler)
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid Authorization header with Bearer token'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ 
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.'
        });
      }
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid.'
      });
    }
    
    // Attach decoded user info to request
    req.user = decoded;
    next();
  });
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for routes that work differently for logged-in vs anonymous users
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    req.user = err ? null : decoded;
    next();
  });
}

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with id, username, etc.
 * @param {string} expiresIn - Token expiration (e.g., '24h', '7d')
 * @returns {string} JWT token
 */
function generateToken(user, expiresIn = '24h') {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn }
  );
}

module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.optionalAuth = optionalAuth;
module.exports.generateToken = generateToken;
