// routes/analytics.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Get overall analytics
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end_date ? new Date(end_date) : new Date();

    // Get orders data
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (ordersError) throw ordersError;

    // Get users data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (usersError) throw usersError;

    // Get campaigns data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (campaignsError) throw campaignsError;

    const analytics = {
      orders: {
        total: orders.length,
        revenue: orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0).toFixed(2),
        average_value: orders.length > 0 
          ? (orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0) / orders.length).toFixed(2)
          : 0,
        by_status: {
          pending: orders.filter(o => o.status === 'pending').length,
          processing: orders.filter(o => o.status === 'processing').length,
          delivered: orders.filter(o => o.status === 'delivered').length,
          cancelled: orders.filter(o => o.status === 'cancelled').length
        }
      },
      users: {
        new_users: users.length,
        total_users: users.length
      },
      campaigns: {
        total: campaigns.length,
        sent: campaigns.filter(c => c.status === 'sent').length,
        total_recipients: campaigns.reduce((sum, c) => sum + (c.recipients_count || 0), 0),
        total_opens: campaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0),
        total_clicks: campaigns.reduce((sum, c) => sum + (c.clicked_count || 0), 0)
      }
    };

    res.json({ analytics, period: { start_date: startDate, end_date: endDate } });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ error: { message: 'Failed to get analytics', status: 500 } });
  }
});

// Get revenue analytics
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const { period = 'month', start_date, end_date } = req.query;
    
    const startDate = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const endDate = end_date ? new Date(end_date) : new Date();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total, created_at, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at');

    if (error) throw error;

    // Group by period
    const groupedData = groupByPeriod(orders, period);

    res.json({ revenue: groupedData });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: { message: 'Failed to get revenue analytics', status: 500 } });
  }
});

// Get order trends
router.get('/orders/trends', authenticateToken, async (req, res) => {
  try {
    const { period = 'day', days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_at, status')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    if (error) throw error;

    const trends = groupOrdersByPeriod(orders, period);

    res.json({ trends });
  } catch (error) {
    console.error('Get order trends error:', error);
    res.status(500).json({ error: { message: 'Failed to get order trends', status: 500 } });
  }
});

// Get top performing products/stores
router.get('/top-performers', authenticateToken, async (req, res) => {
  try {
    const { type = 'stores', limit = 10 } = req.query;

    if (type === 'stores') {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          total,
          store_id,
          stores(name)
        `);

      if (error) throw error;

      // Group by store
      const storePerformance = {};
      orders.forEach(order => {
        const storeId = order.store_id;
        const storeName = order.stores?.name || 'Unknown';
        
        if (!storePerformance[storeId]) {
          storePerformance[storeId] = {
            store_id: storeId,
            store_name: storeName,
            total_orders: 0,
            total_revenue: 0
          };
        }
        
        storePerformance[storeId].total_orders += 1;
        storePerformance[storeId].total_revenue += parseFloat(order.total) || 0;
      });

      const topStores = Object.values(storePerformance)
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, parseInt(limit));

      res.json({ top_performers: topStores });
    } else if (type === 'delivery') {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          total,
          delivery_company_id,
          delivery_companies(name)
        `);

      if (error) throw error;

      // Group by delivery company
      const deliveryPerformance = {};
      orders.forEach(order => {
        const deliveryId = order.delivery_company_id;
        const deliveryName = order.delivery_companies?.name || 'Unknown';
        
        if (!deliveryPerformance[deliveryId]) {
          deliveryPerformance[deliveryId] = {
            delivery_id: deliveryId,
            delivery_name: deliveryName,
            total_orders: 0,
            total_revenue: 0
          };
        }
        
        deliveryPerformance[deliveryId].total_orders += 1;
        deliveryPerformance[deliveryId].total_revenue += parseFloat(order.total) || 0;
      });

      const topDelivery = Object.values(deliveryPerformance)
        .sort((a, b) => b.total_orders - a.total_orders)
        .slice(0, parseInt(limit));

      res.json({ top_performers: topDelivery });
    } else {
      res.status(400).json({ error: { message: 'Invalid type parameter', status: 400 } });
    }
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({ error: { message: 'Failed to get top performers', status: 500 } });
  }
});

// Get conversion funnel
router.get('/conversion-funnel', authenticateToken, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('status');

    if (error) throw error;

    const funnel = {
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };

    const total = orders.length;
    const funnelWithRates = {
      pending: {
        count: funnel.pending,
        rate: total > 0 ? ((funnel.pending / total) * 100).toFixed(2) : 0
      },
      processing: {
        count: funnel.processing,
        rate: total > 0 ? ((funnel.processing / total) * 100).toFixed(2) : 0
      },
      delivered: {
        count: funnel.delivered,
        rate: total > 0 ? ((funnel.delivered / total) * 100).toFixed(2) : 0
      },
      cancelled: {
        count: funnel.cancelled,
        rate: total > 0 ? ((funnel.cancelled / total) * 100).toFixed(2) : 0
      }
    };

    res.json({ funnel: funnelWithRates, total });
  } catch (error) {
    console.error('Get conversion funnel error:', error);
    res.status(500).json({ error: { message: 'Failed to get conversion funnel', status: 500 } });
  }
});

// Get customer lifetime value
router.get('/customer-ltv', authenticateToken, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('created_by, total');

    if (error) throw error;

    // Group by customer
    const customerValues = {};
    orders.forEach(order => {
      const customerId = order.created_by;
      if (!customerId) return;

      if (!customerValues[customerId]) {
        customerValues[customerId] = {
          customer_id: customerId,
          total_orders: 0,
          total_spent: 0
        };
      }

      customerValues[customerId].total_orders += 1;
      customerValues[customerId].total_spent += parseFloat(order.total) || 0;
    });

    const customers = Object.values(customerValues);
    const avgLTV = customers.length > 0
      ? (customers.reduce((sum, c) => sum + c.total_spent, 0) / customers.length).toFixed(2)
      : 0;

    res.json({ 
      average_ltv: avgLTV,
      total_customers: customers.length,
      top_customers: customers.sort((a, b) => b.total_spent - a.total_spent).slice(0, 10)
    });
  } catch (error) {
    console.error('Get customer LTV error:', error);
    res.status(500).json({ error: { message: 'Failed to get customer LTV', status: 500 } });
  }
});

// Helper function to group data by period
function groupByPeriod(orders, period) {
  const grouped = {};

  orders.forEach(order => {
    const date = new Date(order.created_at);
    let key;

    if (period === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (period === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (period === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (period === 'year') {
      key = date.getFullYear().toString();
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        revenue: 0,
        orders: 0
      };
    }

    grouped[key].revenue += parseFloat(order.total) || 0;
    grouped[key].orders += 1;
  });

  return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
}

// Helper function to group orders by period
function groupOrdersByPeriod(orders, period) {
  const grouped = {};

  orders.forEach(order => {
    const date = new Date(order.created_at);
    let key;

    if (period === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (period === 'hour') {
      key = `${date.toISOString().split('T')[0]} ${String(date.getHours()).padStart(2, '0')}:00`;
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        total: 0,
        pending: 0,
        processing: 0,
        delivered: 0,
        cancelled: 0
      };
    }

    grouped[key].total += 1;
    grouped[key][order.status] = (grouped[key][order.status] || 0) + 1;
  });

  return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
}

module.exports = router;