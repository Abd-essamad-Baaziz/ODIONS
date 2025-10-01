// routes/campaigns.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Get all campaigns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, type, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('campaigns')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ campaigns: data, total: count });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: { message: 'Failed to get campaigns', status: 500 } });
  }
});

// Get campaign by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'Campaign not found', status: 404 } });
    }

    res.json({ campaign: data });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: { message: 'Failed to get campaign', status: 500 } });
  }
});

// Create campaign
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, recipients_count } = req.body;

    if (!name || !type) {
      return res.status(400).json({ 
        error: { message: 'Name and type are required', status: 400 } 
      });
    }

    const campaignData = {
      name,
      type,
      status: 'draft',
      recipients_count: recipients_count || 0,
      opened_count: 0,
      clicked_count: 0,
      conversion_count: 0,
      created_by: req.user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('campaigns')
      .insert([campaignData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Campaign created successfully', 
      campaign: data 
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: { message: 'Failed to create campaign', status: 500 } });
  }
});

// Update campaign
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, status, recipients_count, opened_count, clicked_count, conversion_count } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (recipients_count !== undefined) updateData.recipients_count = recipients_count;
    if (opened_count !== undefined) updateData.opened_count = opened_count;
    if (clicked_count !== undefined) updateData.clicked_count = clicked_count;
    if (conversion_count !== undefined) updateData.conversion_count = conversion_count;

    const { data, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Campaign updated successfully', campaign: data });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: { message: 'Failed to update campaign', status: 500 } });
  }
});

// Send campaign
router.post('/:id/send', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('campaigns')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Campaign sent successfully', campaign: data });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({ error: { message: 'Failed to send campaign', status: 500 } });
  }
});

// Delete campaign
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: { message: 'Failed to delete campaign', status: 500 } });
  }
});

// Get campaign statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('campaigns')
      .select('recipients_count, opened_count, clicked_count, conversion_count')
      .eq('id', id)
      .single();

    if (error) throw error;

    const stats = {
      recipients: data.recipients_count,
      opened: data.opened_count,
      clicked: data.clicked_count,
      conversions: data.conversion_count,
      open_rate: data.recipients_count > 0 
        ? ((data.opened_count / data.recipients_count) * 100).toFixed(2)
        : 0,
      click_rate: data.opened_count > 0 
        ? ((data.clicked_count / data.opened_count) * 100).toFixed(2)
        : 0,
      conversion_rate: data.recipients_count > 0 
        ? ((data.conversion_count / data.recipients_count) * 100).toFixed(2)
        : 0
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({ error: { message: 'Failed to get campaign statistics', status: 500 } });
  }
});

module.exports = router;