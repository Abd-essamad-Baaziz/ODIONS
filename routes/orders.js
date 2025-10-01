// routes/orders.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Get all orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, client, store, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('orders')
      .select(`
        *,
        delivery_companies(name),
        stores(name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (client) query = query.ilike('client', `%${client}%`);
    if (store) query = query.eq('store_id', store);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ orders: data, total: count });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: { message: 'Failed to get orders', status: 500 } });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        delivery_companies(name, email, phone, country),
        stores(name, address)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'Order not found', status: 404 } });
    }

    res.json({ order: data });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: { message: 'Failed to get order', status: 500 } });
  }
});

// Create order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      client, 
      delivery_company_id, 
      store_id, 
      total, 
      items 
    } = req.body;

    if (!client || !delivery_company_id || !store_id || !total) {
      return res.status(400).json({ 
        error: { message: 'Missing required fields', status: 400 } 
      });
    }

    const orderData = {
      order_id: `ORD-${Date.now()}`,
      client,
      delivery_company_id,
      store_id,
      status: 'pending',
      total,
      items: items || [],
      created_by: req.user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Order created successfully', 
      order: data 
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: { message: 'Failed to create order', status: 500 } });
  }
});

// Update order
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, client, total, items } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (status !== undefined) updateData.status = status;
    if (client !== undefined) updateData.client = client;
    if (total !== undefined) updateData.total = total;
    if (items !== undefined) updateData.items = items;

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Order updated successfully', order: data });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: { message: 'Failed to update order', status: 500 } });
  }
});

// Delete order
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: { message: 'Failed to delete order', status: 500 } });
  }
});

// Get order statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, total, created_at');

    if (error) throw error;

    const stats = {
      total_orders: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      total_revenue: orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: { message: 'Failed to get statistics', status: 500 } });
  }
});

module.exports = router;