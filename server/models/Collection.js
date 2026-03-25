const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#3B82F6' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Collection', collectionSchema);
