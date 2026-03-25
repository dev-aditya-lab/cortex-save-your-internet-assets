const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { generateEmbedding, cosineSimilarity } = require('../services/ai');

// Semantic search - REAL embedding-based
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required' });

    console.log(`[SEARCH] Query: "${q}"`);

    // Step 1: Generate real embedding for query
    const queryEmbedding = await generateEmbedding(q);
    if (!queryEmbedding.length) {
      return res.status(500).json({ error: 'Failed to generate query embedding' });
    }
    console.log(`[SEARCH] Query embedding: ${queryEmbedding.length} dimensions`);

    // Step 2: Get all items with embeddings
    const allItems = await Item.find({ embedding: { $exists: true, $ne: [] } });
    console.log(`[SEARCH] Comparing against ${allItems.length} items`);

    // Step 3: Compute cosine similarity against all stored embeddings
    const results = allItems
      .map(item => ({
        item,
        score: cosineSimilarity(queryEmbedding, item.embedding)
      }))
      .filter(s => s.score > 0.1) // minimum threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    console.log(`[SEARCH] Found ${results.length} matches above threshold`);

    res.json(results.map(r => ({
      ...r.item.toObject(),
      similarity: Math.round(r.score * 10000) / 100, // real score
      embedding: undefined
    })));
  } catch (err) {
    console.error('[SEARCH] Error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
