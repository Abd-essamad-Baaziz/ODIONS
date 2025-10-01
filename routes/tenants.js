// routes/tenants.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all tenants
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ tenants: data });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: { message: 'Failed to get tenants', status: 500 } });
  }
});

// Get tenant by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'Tenant not found', status: 404 } });
    }

    res.json({ tenant: data });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ error: { message: 'Failed to get tenant', status: 500 } });
  }
});

// Create tenant
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, subscription, status } = req.body;

    if (!name || !subscription) {
      return res.status(400).json({ 
        error: { message: 'Name and subscription are required', status: 400 } 
      });
    }

    const tenantData = {
      name,
      subscription,
      status: status || 'active',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tenants')
      .insert([tenantData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Tenant created successfully', 
      tenant: data 
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: { message: 'Failed to create tenant', status: 500 } });
  }
});

// Update tenant
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subscription, status } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (subscription !== undefined) updateData.subscription = subscription;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Tenant updated successfully', tenant: data });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: { message: 'Failed to update tenant', status: 500 } });
  }
});

// Delete tenant
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: { message: 'Failed to delete tenant', status: 500 } });
  }
});

module.exports = router;