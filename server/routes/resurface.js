const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { cosineSimilarity } = require('../services/ai');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const totalItems = await Item.countDocuments({ userId: req.userId });
    if (totalItems === 0) return res.json([]);

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const buckets = [
      { label: '7 days ago', minDays: 6, maxDays: 8 },
      { label: '30 days ago', minDays: 28, maxDays: 32 },
      { label: '90 days ago', minDays: 85, maxDays: 95 },
      { label: 'older', minDays: 1, maxDays: 365 },
    ];

    let resurfaced = [];

    for (const bucket of buckets) {
      const items = await Item.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId.toString()), createdAt: { $gte: new Date(now - bucket.maxDays * DAY), $lte: new Date(now - bucket.minDays * DAY) } } },
        { $sample: { size: 2 } },
        { $project: { embedding: 0 } }
      ]);

      items.forEach(item => {
        const daysAgo = Math.floor((now - new Date(item.createdAt).getTime()) / DAY);
        resurfaced.push({ ...item, daysAgo, resurfaceReason: bucket.label });
      });
    }

    // Relevance boost
    const mostRecent = await Item.findOne({ userId: req.userId }).sort({ createdAt: -1 });
    if (mostRecent?.embedding?.length) {
      const olderItems = await Item.find({
        userId: req.userId, _id: { $ne: mostRecent._id },
        createdAt: { $lt: new Date(now - 2 * DAY) },
        embedding: { $exists: true, $not: { $size: 0 } }
      }).limit(50);

      const similar = olderItems
        .map(item => ({ item, score: cosineSimilarity(mostRecent.embedding, item.embedding) }))
        .filter(s => s.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);

      similar.forEach(({ item, score }) => {
        const daysAgo = Math.floor((now - new Date(item.createdAt).getTime()) / DAY);
        const obj = item.toObject(); delete obj.embedding;
        resurfaced.push({ ...obj, daysAgo, resurfaceReason: `relevant to recent save (${Math.round(score * 100)}% similar)`, relevanceScore: Math.round(score * 100) });
      });
    }

    // Fallback
    if (resurfaced.length === 0) {
      const randomItems = await Item.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(req.userId.toString()) } },
        { $sample: { size: 3 } },
        { $project: { embedding: 0 } }
      ]);
      randomItems.forEach(item => {
        const daysAgo = Math.floor((now - new Date(item.createdAt).getTime()) / DAY);
        resurfaced.push({ ...item, daysAgo, resurfaceReason: 'random discovery' });
      });
    }

    // Deduplicate
    const seen = new Set();
    const unique = resurfaced.filter(item => {
      const id = String(item._id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    res.json(unique.slice(0, 6));
  } catch (err) {
    console.error('[RESURFACE]', err);
    res.status(500).json({ error: 'Failed to resurface memories' });
  }
});

module.exports = router;
