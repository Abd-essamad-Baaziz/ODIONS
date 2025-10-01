// routes/chatbots.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Get all chatbot sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const { user_id, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('chatbot_sessions')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ sessions: data, total: count });
  } catch (error) {
    console.error('Get chatbot sessions error:', error);
    res.status(500).json({ error: { message: 'Failed to get chatbot sessions', status: 500 } });
  }
});

// Get session by ID
router.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('chatbot_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'Session not found', status: 404 } });
    }

    res.json({ session: data });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: { message: 'Failed to get session', status: 500 } });
  }
});

// Create chatbot session
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessionData = {
      user_id: req.user.id,
      session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messages: [],
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('chatbot_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Session created successfully', 
      session: data 
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: { message: 'Failed to create session', status: 500 } });
  }
});

// Add message to session
router.post('/sessions/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, role } = req.body;

    if (!message || !role) {
      return res.status(400).json({ 
        error: { message: 'Message and role are required', status: 400 } 
      });
    }

    // Get current session
    const { data: session, error: fetchError } = await supabase
      .from('chatbot_sessions')
      .select('messages')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: { message: 'Session not found', status: 404 } });
    }

    // Add new message
    const messages = session.messages || [];
    messages.push({
      role,
      content: message,
      timestamp: new Date().toISOString()
    });

    // Update session
    const { data, error } = await supabase
      .from('chatbot_sessions')
      .update({ messages })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      message: 'Message added successfully', 
      session: data 
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: { message: 'Failed to add message', status: 500 } });
  }
});

// End chatbot session
router.post('/sessions/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('chatbot_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Session ended successfully', session: data });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: { message: 'Failed to end session', status: 500 } });
  }
});

// Get chatbot statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const { data: sessions, error } = await supabase
      .from('chatbot_sessions')
      .select('started_at, ended_at, messages');

    if (error) throw error;

    const currentMonthSessions = sessions.filter(s => 
      new Date(s.started_at) >= lastMonth
    );

    const stats = {
      total_sessions: currentMonthSessions.length,
      active_sessions: currentMonthSessions.filter(s => !s.ended_at).length,
      avg_messages_per_session: currentMonthSessions.length > 0
        ? (currentMonthSessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0) / currentMonthSessions.length).toFixed(2)
        : 0,
      avg_session_duration: currentMonthSessions.filter(s => s.ended_at).length > 0
        ? calculateAvgDuration(currentMonthSessions.filter(s => s.ended_at))
        : 0
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get chatbot stats error:', error);
    res.status(500).json({ error: { message: 'Failed to get chatbot statistics', status: 500 } });
  }
});

// Helper function to calculate average duration
function calculateAvgDuration(sessions) {
  const durations = sessions.map(s => {
    const start = new Date(s.started_at);
    const end = new Date(s.ended_at);
    return (end - start) / 1000 / 60; // in minutes
  });

  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  return avg.toFixed(2);
}

// Delete session
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('chatbot_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: { message: 'Failed to delete session', status: 500 } });
  }
});

module.exports = router;