require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const questionRoutes = require('./routes/questions');
const responseRoutes = require('./routes/responses');
const uploadRoutes = require('./routes/upload');
const { router: notificationRoutes } = require('./routes/notifications');


// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);


// Basic route for testing
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Gather API is running!',
    timestamp: new Date().toISOString()
  });
});

// Serve main app for all other routes (SPA fallback)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle other non-API routes
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✓ Connected to MongoDB');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API available at http://localhost:${PORT}/api/health`);
    });
  })
  .catch((error) => {
    console.error('✗ MongoDB connection error:', error.message);
    console.log('Please check your MONGODB_URI in the .env file');
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});