const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { generateEmbedding, cosineSimilarity } = require('../services/ai');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required' });

    const queryEmbedding = await generateEmbedding(q);
    if (!queryEmbedding.length) return res.status(500).json({ error: 'Failed to generate query embedding' });

    const allItems = await Item.find({ userId: req.userId, embedding: { $exists: true, $ne: [] } });

    const results = allItems
      .map(item => ({ item, score: cosineSimilarity(queryEmbedding, item.embedding) }))
      .filter(s => s.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json(results.map(r => ({
      ...r.item.toObject(),
      similarity: Math.round(r.score * 10000) / 100,
      embedding: undefined
    })));
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
