const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { cosineSimilarity } = require('../services/ai');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 0.3;
    const items = await Item.find({ userId: req.userId })
      .select('title type tags domain embedding thumbnail createdAt');

    const nodes = items.map(item => ({
      id: String(item._id),
      title: item.title,
      type: item.type,
      tags: item.tags || [],
      domain: item.domain,
      thumbnail: item.thumbnail,
      hasEmbedding: item.embedding?.length > 0,
      createdAt: item.createdAt
    }));

    // Compute all edges above threshold
    const edges = [];
    const connectionCount = {};

    for (let i = 0; i < items.length; i++) {
      if (!items[i].embedding?.length) continue;
      for (let j = i + 1; j < items.length; j++) {
        if (!items[j].embedding?.length) continue;
        const sim = cosineSimilarity(items[i].embedding, items[j].embedding);
        if (sim > threshold) {
          const srcId = String(items[i]._id);
          const tgtId = String(items[j]._id);
          edges.push({
            source: srcId,
            target: tgtId,
            similarity: Math.round(sim * 10000) / 10000,
            value: Math.round(sim * 100)
          });
          connectionCount[srcId] = (connectionCount[srcId] || 0) + 1;
          connectionCount[tgtId] = (connectionCount[tgtId] || 0) + 1;
        }
      }
    }

    // Add connection count to nodes
    nodes.forEach(n => { n.connections = connectionCount[n.id] || 0; });

    // Collect all tags for filtering
    const allTags = [...new Set(items.flatMap(i => i.tags || []))].sort();

    res.json({
      nodes,
      edges,
      allTags,
      metadata: {
        threshold,
        totalItems: items.length,
        connectedItems: Object.keys(connectionCount).length,
        totalEdges: edges.length
      }
    });
  } catch (err) {
    console.error('[GRAPH]', err.message);
    res.status(500).json({ error: 'Failed to generate graph data' });
  }
});

module.exports = router;
