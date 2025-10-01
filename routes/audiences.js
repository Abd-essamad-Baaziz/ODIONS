// routes/audiences.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Get all audiences
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audiences')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ audiences: data });
  } catch (error) {
    console.error('Get audiences error:', error);
    res.status(500).json({ error: { message: 'Failed to get audiences', status: 500 } });
  }
});

// Get audience by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('audiences')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'Audience not found', status: 404 } });
    }

    res.json({ audience: data });
  } catch (error) {
    console.error('Get audience error:', error);
    res.status(500).json({ error: { message: 'Failed to get audience', status: 500 } });
  }
});

// Create audience
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, filters } = req.body;

    if (!name) {
      return res.status(400).json({ 
        error: { message: 'Name is required', status: 400 } 
      });
    }

    // Calculate user count based on filters
    // This is a simplified version - you'd implement actual filter logic
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const audienceData = {
      name,
      description: description || '',
      filters: filters || {},
      user_count: count || 0,
      created_by: req.user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('audiences')
      .insert([audienceData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Audience created successfully', 
      audience: data 
    });
  } catch (error) {
    console.error('Create audience error:', error);
    res.status(500).json({ error: { message: 'Failed to create audience', status: 500 } });
  }
});

// Update audience
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, filters } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (filters !== undefined) {
      updateData.filters = filters;
      
      // Recalculate user count
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      updateData.user_count = count || 0;
    }

    const { data, error } = await supabase
      .from('audiences')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Audience updated successfully', audience: data });
  } catch (error) {
    console.error('Update audience error:', error);
    res.status(500).json({ error: { message: 'Failed to update audience', status: 500 } });
  }
});

// Delete audience
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('audiences')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Audience deleted successfully' });
  } catch (error) {
    console.error('Delete audience error:', error);
    res.status(500).json({ error: { message: 'Failed to delete audience', status: 500 } });
  }
});

// Get audience members
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Get audience filters
    const { data: audience, error: audienceError } = await supabase
      .from('audiences')
      .select('filters')
      .eq('id', id)
      .single();

    if (audienceError) {
      return res.status(404).json({ error: { message: 'Audience not found', status: 404 } });
    }

    // Get users based on filters
    // This is simplified - implement actual filter logic based on your needs
    const { data: members, error, count } = await supabase
      .from('users')
      .select('id, email, full_name, created_at', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ members, total: count });
  } catch (error) {
    console.error('Get audience members error:', error);
    res.status(500).json({ error: { message: 'Failed to get audience members', status: 500 } });
  }
});

module.exports = router;