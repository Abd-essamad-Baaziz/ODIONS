// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tenantRoutes = require('./routes/tenants');
const deliveryRoutes = require('./routes/delivery');
const orderRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const campaignRoutes = require('./routes/campaigns');
const audienceRoutes = require('./routes/audiences');
const chatbotRoutes = require('./routes/chatbots');
const storeRoutes = require('./routes/stores');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/delivery-companies', deliveryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/audiences', audienceRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chrome DevTools route
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.json({});
});


  // Serve static files from checklist-frontend/public
  app.use(express.static(path.join(__dirname, '../checklist-frontend/public')));

  // Root route serves login page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../checklist-frontend/public/index.html'));
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found', status: 404 } });
});

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;