const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { cosineSimilarity } = require('../services/ai');

// Get graph data (nodes + edges based on similarity)
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().select('title type tags domain embedding thumbnail');
    const SIMILARITY_THRESHOLD = 0.4;

    const nodes = items.map(item => ({
      id: String(item._id),
      title: item.title.substring(0, 40),
      type: item.type,
      tags: item.tags,
      domain: item.domain,
      thumbnail: item.thumbnail
    }));

    const edges = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (!items[i].embedding?.length || !items[j].embedding?.length) continue;
        const sim = cosineSimilarity(items[i].embedding, items[j].embedding);
        if (sim > SIMILARITY_THRESHOLD) {
          edges.push({
            source: String(items[i]._id),
            target: String(items[j]._id),
            value: Math.round(sim * 100)
          });
        }
      }
    }

    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate graph data' });
  }
});

module.exports = router;
