// routes/delivery.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Get all delivery companies
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('delivery_companies')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json({ delivery_companies: data });
  } catch (error) {
    console.error('Get delivery companies error:', error);
    res.status(500).json({ error: { message: 'Failed to get delivery companies', status: 500 } });
  }
});

// Get delivery company by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('delivery_companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'Delivery company not found', status: 404 } });
    }

    res.json({ delivery_company: data });
  } catch (error) {
    console.error('Get delivery company error:', error);
    res.status(500).json({ error: { message: 'Failed to get delivery company', status: 500 } });
  }
});

// Create delivery company
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, country } = req.body;

    if (!name || !email || !phone || !country) {
      return res.status(400).json({ 
        error: { message: 'Name, email, phone, and country are required', status: 400 } 
      });
    }

    const companyData = {
      name,
      email,
      phone,
      country,
      status: true,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('delivery_companies')
      .insert([companyData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Delivery company created successfully', 
      delivery_company: data 
    });
  } catch (error) {
    console.error('Create delivery company error:', error);
    res.status(500).json({ error: { message: 'Failed to create delivery company', status: 500 } });
  }
});

// Update delivery company
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, country, status } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (country !== undefined) updateData.country = country;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('delivery_companies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      message: 'Delivery company updated successfully', 
      delivery_company: data 
    });
  } catch (error) {
    console.error('Update delivery company error:', error);
    res.status(500).json({ error: { message: 'Failed to update delivery company', status: 500 } });
  }
});

// Toggle delivery company status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (typeof status !== 'boolean') {
      return res.status(400).json({ 
        error: { message: 'Status must be a boolean', status: 400 } 
      });
    }

    const { data, error } = await supabase
      .from('delivery_companies')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      message: 'Status updated successfully', 
      delivery_company: data 
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: { message: 'Failed to update status', status: 500 } });
  }
});

// Delete delivery company
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if company has active orders
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('delivery_company_id', id)
      .limit(1);

    if (orders && orders.length > 0) {
      return res.status(400).json({ 
        error: { message: 'Cannot delete company with existing orders', status: 400 } 
      });
    }

    const { error } = await supabase
      .from('delivery_companies')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Delivery company deleted successfully' });
  } catch (error) {
    console.error('Delete delivery company error:', error);
    res.status(500).json({ error: { message: 'Failed to delete delivery company', status: 500 } });
  }
});

module.exports = router;