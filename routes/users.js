const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ users: data });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: { message: 'Failed to get users', status: 500 } });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless admin
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (currentUser.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'User not found', status: 404 } });
    }

    res.json({ user: data });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: { message: 'Failed to get user', status: 500 } });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, avatar_url } = req.body;

    // Users can only update their own profile unless admin
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (currentUser.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'User updated successfully', user: data });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: { message: 'Failed to update user', status: 500 } });
  }
});

// Update user role (admin only)
router.patch('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'manager'].includes(role)) {
      return res.status(400).json({ error: { message: 'Invalid role', status: 400 } });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'User role updated successfully', user: data });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: { message: 'Failed to update role', status: 500 } });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: { message: 'Failed to delete user', status: 500 } });
  }
});

module.exports = router;