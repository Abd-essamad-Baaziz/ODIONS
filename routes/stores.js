// routes/stores.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Get all stores
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json({ stores: data });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: { message: 'Failed to get stores', status: 500 } });
  }
});

// Get store by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'Store not found', status: 404 } });
    }

    res.json({ store: data });
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({ error: { message: 'Failed to get store', status: 500 } });
  }
});

// Create store
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ 
        error: { message: 'Store name is required', status: 400 } 
      });
    }

    const storeData = {
      name,
      address: address || '',
      phone: phone || '',
      email: email || '',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('stores')
      .insert([storeData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Store created successfully', 
      store: data 
    });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({ error: { message: 'Failed to create store', status: 500 } });
  }
});

// Update store
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, email } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    const { data, error } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Store updated successfully', store: data });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ error: { message: 'Failed to update store', status: 500 } });
  }
});

// Delete store
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if store has orders
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('store_id', id)
      .limit(1);

    if (orders && orders.length > 0) {
      return res.status(400).json({ 
        error: { message: 'Cannot delete store with existing orders', status: 400 } 
      });
    }

    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({ error: { message: 'Failed to delete store', status: 500 } });
  }
});

// Get store statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, total')
      .eq('store_id', id);

    if (error) throw error;

    const stats = {
      total_orders: orders.length,
      pending_orders: orders.filter(o => o.status === 'pending').length,
      delivered_orders: orders.filter(o => o.status === 'delivered').length,
      total_revenue: orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0).toFixed(2)
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get store stats error:', error);
    res.status(500).json({ error: { message: 'Failed to get store statistics', status: 500 } });
  }
});

module.exports = router;