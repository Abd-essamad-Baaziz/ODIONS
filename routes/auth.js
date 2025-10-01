// routes/auth.js
const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        error: { message: 'Email, password, and full name are required', status: 400 } 
      });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authError) {
      return res.status(400).json({ error: { message: authError.message, status: 400 } });
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: authData.user.email,
          full_name: fullName,
          role: 'user',
          created_at: new Date().toISOString()
        }
      ]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: fullName
      },
      session: authData.session
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: { message: 'Signup failed', status: 500 } });
  }
});

// Sign in
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: { message: 'Email and password are required', status: 400 } 
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: { message: error.message, status: 401 } });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      message: 'Signed in successfully',
      user: {
        ...data.user,
        profile
      },
      session: data.session
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: { message: 'Signin failed', status: 500 } });
  }
});

// Sign out
router.post('/signout', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: { message: error.message, status: 400 } });
    }

    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: { message: 'Signout failed', status: 500 } });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'User not found', status: 404 } });
    }

    res.json({ user: { ...req.user, profile } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: { message: 'Failed to get user', status: 500 } });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ 
        error: { message: 'Refresh token required', status: 400 } 
      });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
      return res.status(401).json({ error: { message: error.message, status: 401 } });
    }

    res.json({
      message: 'Token refreshed successfully',
      session: data.session
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: { message: 'Token refresh failed', status: 500 } });
  }
});

// Reset password request
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: { message: 'Email is required', status: 400 } 
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL}/reset-password`
    });

    if (error) {
      return res.status(400).json({ error: { message: error.message, status: 400 } });
    }

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: { message: 'Password reset failed', status: 500 } });
  }
});

// Update password
router.post('/update-password', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        error: { message: 'New password is required', status: 400 } 
      });
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return res.status(400).json({ error: { message: error.message, status: 400 } });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: { message: 'Password update failed', status: 500 } });
  }
});

module.exports = router;