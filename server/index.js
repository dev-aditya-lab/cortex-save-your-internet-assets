require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { preloadModel } = require('./services/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth routes (no middleware needed)
app.use('/api/auth', require('./routes/auth'));

// Protected routes (auth middleware applied inside each route file)
app.use('/api/items', require('./routes/items'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/search', require('./routes/search'));
app.use('/api/resurface', require('./routes/resurface'));
app.use('/api/graph', require('./routes/graph'));
app.use('/api/debug', require('./routes/debug'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    console.log('Preloading embedding model...');
    preloadModel();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
