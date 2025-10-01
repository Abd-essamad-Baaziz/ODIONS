// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get orders data
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('status, total, created_at');

    if (ordersError) throw ordersError;

    // Calculate current month stats
    const currentMonthOrders = orders.filter(o => 
      new Date(o.created_at) >= currentMonth
    );
    const lastMonthOrders = orders.filter(o => 
      new Date(o.created_at) >= lastMonth && new Date(o.created_at) < currentMonth
    );

    // Total Orders
    const totalOrders = currentMonthOrders.length;
    const lastMonthTotalOrders = lastMonthOrders.length;
    const ordersChange = lastMonthTotalOrders > 0 
      ? ((totalOrders - lastMonthTotalOrders) / lastMonthTotalOrders * 100).toFixed(1)
      : 0;

    // Refused Orders
    const refusedOrders = currentMonthOrders.filter(o => 
      o.status === 'cancelled' || o.status === 'refused'
    ).length;
    const lastMonthRefusedOrders = lastMonthOrders.filter(o => 
      o.status === 'cancelled' || o.status === 'refused'
    ).length;
    const refusedChange = lastMonthRefusedOrders > 0 
      ? ((refusedOrders - lastMonthRefusedOrders) / lastMonthRefusedOrders * 100).toFixed(1)
      : 0;

    // Revenue
    const revenue = currentMonthOrders.reduce((sum, o) => 
      sum + (parseFloat(o.total) || 0), 0
    );
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => 
      sum + (parseFloat(o.total) || 0), 0
    );
    const revenueChange = lastMonthRevenue > 0 
      ? ((revenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    // Active Customers
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('created_at')
      .eq('role', 'user');

    if (usersError) throw usersError;

    const activeCustomers = users.filter(u => 
      new Date(u.created_at) >= currentMonth
    ).length;
    const lastMonthActiveCustomers = users.filter(u => 
      new Date(u.created_at) >= lastMonth && new Date(u.created_at) < currentMonth
    ).length;
    const customersChange = lastMonthActiveCustomers > 0 
      ? ((activeCustomers - lastMonthActiveCustomers) / lastMonthActiveCustomers * 100).toFixed(1)
      : 0;

    // Get campaigns data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('created_at')
      .gte('created_at', currentMonth.toISOString());

    const campaignsSent = campaigns ? campaigns.length : 0;
    const lastMonthCampaigns = campaigns ? campaigns.filter(c => 
      new Date(c.created_at) < currentMonth
    ).length : 0;
    const campaignsChange = lastMonthCampaigns > 0 
      ? ((campaignsSent - lastMonthCampaigns) / lastMonthCampaigns * 100).toFixed(1)
      : 0;

    // Chatbot sessions (mock data - replace with real data)
    const chatbotSessions = 892;
    const chatbotChange = 25.6;

    // Conversion rate
    const deliveredOrders = currentMonthOrders.filter(o => o.status === 'delivered').length;
    const conversionRate = totalOrders > 0 
      ? ((deliveredOrders / totalOrders) * 100).toFixed(1)
      : 0;
    const lastMonthDeliveredOrders = lastMonthOrders.filter(o => o.status === 'delivered').length;
    const lastMonthConversionRate = lastMonthTotalOrders > 0 
      ? ((lastMonthDeliveredOrders / lastMonthTotalOrders) * 100)
      : 0;
    const conversionChange = lastMonthConversionRate > 0 
      ? ((conversionRate - lastMonthConversionRate) / lastMonthConversionRate * 100).toFixed(1)
      : 0;

    // Average order value
    const avgOrderValue = totalOrders > 0 
      ? (revenue / totalOrders).toFixed(2)
      : 0;
    const lastMonthAvgOrderValue = lastMonthTotalOrders > 0 
      ? (lastMonthRevenue / lastMonthTotalOrders)
      : 0;
    const avgOrderValueChange = lastMonthAvgOrderValue > 0 
      ? ((avgOrderValue - lastMonthAvgOrderValue) / lastMonthAvgOrderValue * 100).toFixed(1)
      : 0;

    res.json({
      stats: {
        totalOrders: {
          value: totalOrders,
          change: parseFloat(ordersChange)
        },
        refusedOrders: {
          value: refusedOrders,
          change: parseFloat(refusedChange)
        },
        revenue: {
          value: revenue.toFixed(2),
          change: parseFloat(revenueChange)
        },
        activeCustomers: {
          value: activeCustomers,
          change: parseFloat(customersChange)
        },
        campaignsSent: {
          value: campaignsSent,
          change: parseFloat(campaignsChange)
        },
        chatbotSessions: {
          value: chatbotSessions,
          change: chatbotChange
        },
        conversionRate: {
          value: parseFloat(conversionRate),
          change: parseFloat(conversionChange)
        },
        avgOrderValue: {
          value: parseFloat(avgOrderValue),
          change: parseFloat(avgOrderValueChange)
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: { message: 'Failed to get dashboard statistics', status: 500 } });
  }
});

// Get recent orders
router.get('/recent-orders', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        delivery_companies(name),
        stores(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ orders: data });
  } catch (error) {
    console.error('Get recent orders error:', error);
    res.status(500).json({ error: { message: 'Failed to get recent orders', status: 500 } });
  }
});

// Get campaign performance
router.get('/campaign-performance', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    res.json({ campaigns: data });
  } catch (error) {
    console.error('Get campaign performance error:', error);
    res.status(500).json({ error: { message: 'Failed to get campaign performance', status: 500 } });
  }
});

module.exports = router;