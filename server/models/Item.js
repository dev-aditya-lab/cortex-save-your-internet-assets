const mongoose = require('mongoose');

const highlightSchema = new mongoose.Schema({
  text: { type: String, required: true },
  note: { type: String, default: '' },
  color: { type: String, default: '#3B82F6' },
  createdAt: { type: Date, default: Date.now }
});

const itemSchema = new mongoose.Schema({
  url: { type: String, default: '' },
  type: {
    type: String,
    enum: ['article', 'tweet', 'youtube', 'image', 'pdf', 'other'],
    default: 'article'
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  tags: [{ type: String }],
  embedding: [{ type: Number }],
  collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null },
  highlights: [highlightSchema],
  domain: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

itemSchema.index({ tags: 1 });
itemSchema.index({ collectionId: 1 });
itemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Item', itemSchema);
