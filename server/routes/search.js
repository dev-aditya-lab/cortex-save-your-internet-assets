const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { generateEmbedding, findRelated } = require('../services/ai');

// Semantic search
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required' });

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(q);

    // Get all items with embeddings
    const allItems = await Item.find({ embedding: { $exists: true, $ne: [] } });

    // Find related using cosine similarity
    const results = findRelated(queryEmbedding, allItems, 20);

    res.json(results.map(r => ({
      ...r.item.toObject(),
      similarity: Math.round(r.score * 100),
      embedding: undefined
    })));
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
