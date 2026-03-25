const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { cosineSimilarity } = require('../services/ai');

// SIMILARITY_THRESHOLD for graph edges
const GRAPH_EDGE_THRESHOLD = 0.3;

// Get graph data with real similarity-based edges
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().select('title type tags domain embedding thumbnail');

    const nodes = items.map(item => ({
      id: String(item._id),
      title: item.title.substring(0, 50),
      type: item.type,
      tags: item.tags,
      domain: item.domain,
      thumbnail: item.thumbnail,
      hasEmbedding: item.embedding?.length > 0
    }));

    // Build edges from REAL cosine similarity
    const edges = [];
    for (let i = 0; i < items.length; i++) {
      if (!items[i].embedding?.length) continue;
      for (let j = i + 1; j < items.length; j++) {
        if (!items[j].embedding?.length) continue;

        const sim = cosineSimilarity(items[i].embedding, items[j].embedding);
        if (sim > GRAPH_EDGE_THRESHOLD) {
          edges.push({
            source: String(items[i]._id),
            target: String(items[j]._id),
            similarity: Math.round(sim * 10000) / 10000, // real score, 4 decimals
            value: Math.round(sim * 100)
          });
        }
      }
    }

    console.log(`[GRAPH] ${nodes.length} nodes, ${edges.length} edges (threshold: ${GRAPH_EDGE_THRESHOLD})`);

    res.json({
      nodes,
      edges,
      metadata: {
        edgeThreshold: GRAPH_EDGE_THRESHOLD,
        similarityFunction: 'cosine_similarity',
        embeddingModel: 'all-MiniLM-L6-v2'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate graph data' });
  }
});

module.exports = router;
