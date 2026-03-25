const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { cosineSimilarity, computeSimilarityMatrix } = require('../services/ai');
const { getClusterState, CLUSTER_THRESHOLD } = require('../services/clustering');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/embeddings', async (req, res) => {
  try {
    const items = await Item.find({ userId: req.userId }).select('_id title type tags embedding createdAt').sort({ createdAt: -1 });
    const data = items.map(item => ({
      id: String(item._id), title: item.title, type: item.type, tags: item.tags,
      hasEmbedding: item.embedding?.length > 0, embeddingDimensions: item.embedding?.length || 0,
      embeddingPreview: item.embedding?.slice(0, 10).map(v => Math.round(v * 10000) / 10000) || [],
      embeddingMagnitude: item.embedding?.length ? Math.round(Math.sqrt(item.embedding.reduce((s, v) => s + v * v, 0)) * 10000) / 10000 : 0,
      createdAt: item.createdAt
    }));
    res.json({ totalItems: items.length, withEmbeddings: data.filter(d => d.hasEmbedding).length, embeddingModel: 'all-MiniLM-L6-v2', embeddingDimensions: 384, items: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/similarity/:id', async (req, res) => {
  try {
    const target = await Item.findOne({ _id: req.params.id, userId: req.userId });
    if (!target) return res.status(404).json({ error: 'Item not found' });
    if (!target.embedding?.length) return res.json({ error: 'No embedding', scores: [] });

    const allItems = await Item.find({ _id: { $ne: target._id }, userId: req.userId }).select('_id title type tags embedding');
    const scores = allItems.filter(i => i.embedding?.length > 0)
      .map(item => ({ id: String(item._id), title: item.title, type: item.type,
        cosineSimilarity: Math.round(cosineSimilarity(target.embedding, item.embedding) * 10000) / 10000,
        isRelated: cosineSimilarity(target.embedding, item.embedding) > 0.15,
        isClusterNeighbor: cosineSimilarity(target.embedding, item.embedding) >= CLUSTER_THRESHOLD
      })).sort((a, b) => b.cosineSimilarity - a.cosineSimilarity);

    res.json({ target: { id: String(target._id), title: target.title, type: target.type },
      embeddingModel: 'all-MiniLM-L6-v2', clusterThreshold: CLUSTER_THRESHOLD, relatedThreshold: 0.15, totalCompared: scores.length, scores });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/matrix', async (req, res) => {
  try {
    const items = await Item.find({ userId: req.userId, embedding: { $exists: true, $not: { $size: 0 } } })
      .select('_id title type embedding').sort({ createdAt: -1 }).limit(20);
    const matrix = computeSimilarityMatrix(items);
    const labels = items.map(i => ({ id: String(i._id), title: i.title.substring(0, 40), type: i.type }));
    res.json({ size: items.length, labels, matrix: matrix.map(row => row.map(v => Math.round(v * 10000) / 10000)), note: 'matrix[i][j] = cosine similarity' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/clusters', async (req, res) => {
  try { const state = await getClusterState(req.userId); res.json(state); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/pipeline-info', async (req, res) => {
  const totalItems = await Item.countDocuments({ userId: req.userId });
  const withEmbeddings = await Item.countDocuments({ userId: req.userId, embedding: { $exists: true, $not: { $size: 0 } } });
  res.json({
    pipeline: ['1. Content Extraction (axios + cheerio)', '2. Metadata Parsing (OG tags, type-specific)', '3. Embedding Generation (all-MiniLM-L6-v2, 384-dim)',
      '4. Tag Generation (Groq LLM / keyword fallback)', '5. Storage (MongoDB)', '6. Similarity Linking (cosine sim + auto-clustering)'],
    embeddingModel: 'Xenova/all-MiniLM-L6-v2', embeddingDimensions: 384, similarityFunction: 'cosine_similarity',
    clusteringAlgorithm: 'threshold_graph_components', clusterThreshold: CLUSTER_THRESHOLD,
    tagModel: 'Groq llama-3.3-70b-versatile', supportedTypes: ['article', 'youtube', 'tweet', 'linkedin', 'image', 'pdf'],
    stats: { totalItems, withEmbeddings }
  });
});

module.exports = router;
