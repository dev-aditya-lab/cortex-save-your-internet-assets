const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// Memory resurfacing - returns random + old items
router.get('/', async (req, res) => {
  try {
    const totalItems = await Item.countDocuments();
    if (totalItems === 0) return res.json([]);

    // Get items saved at least 1 day ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get a mix of random items and older items
    const olderItems = await Item.aggregate([
      { $match: { createdAt: { $lt: oneDayAgo } } },
      { $sample: { size: 3 } },
      { $project: { embedding: 0 } }
    ]);

    const randomItems = await Item.aggregate([
      { $sample: { size: 3 } },
      { $project: { embedding: 0 } }
    ]);

    // Combine & deduplicate
    const seen = new Set();
    const combined = [];
    [...olderItems, ...randomItems].forEach(item => {
      const id = String(item._id);
      if (!seen.has(id)) {
        seen.add(id);
        const daysAgo = Math.floor((Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        combined.push({ ...item, daysAgo });
      }
    });

    res.json(combined.slice(0, 5));
  } catch (err) {
    res.status(500).json({ error: 'Failed to resurface memories' });
  }
});

module.exports = router;
