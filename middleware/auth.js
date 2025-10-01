// middleware/auth.js
const { supabase } = require('../config/supabase');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: { message: 'Access token required', status: 401 } });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: { message: 'Invalid or expired token', status: 401 } });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: { message: 'Authentication failed', status: 500 } });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Authentication required', status: 401 } });
    }

    // Check if user has admin role in your users table
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !userData || userData.role !== 'admin') {
      return res.status(403).json({ error: { message: 'Admin access required', status: 403 } });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: { message: 'Authorization failed', status: 500 } });
  }
};

module.exports = { authenticateToken, requireAdmin };