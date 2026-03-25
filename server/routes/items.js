const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { fetchMetadata } = require('../services/metadata');
const { generateTags, generateEmbedding, findRelated } = require('../services/ai');
const { runClustering } = require('../services/clustering');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// SAVE NEW ITEM - Full Intelligence Pipeline
router.post('/', async (req, res) => {
  try {
    const { url, title, description, type } = req.body;
    if (!url && !title) {
      return res.status(400).json({ error: 'URL or title is required' });
    }

    console.log(`\n[PIPELINE] === Starting save pipeline for user ${req.userId} ===`);

    // Step 1 & 2: Content/Metadata extraction
    let meta = { title: title || '', description: description || '', thumbnail: '', type: type || 'other', domain: '', contentText: '' };
    if (url) meta = await fetchMetadata(url);
    if (title) meta.title = title;
    if (description) meta.description = description;
    if (type) meta.type = type;

    // Step 3: Generate REAL embedding
    const textForEmbedding = meta.contentText || `${meta.title}. ${meta.description}`;
    const embedding = await generateEmbedding(textForEmbedding);

    // Step 4: Generate tags
    const tags = await generateTags(meta.title, meta.description, meta.contentText);

    // Step 5: Store
    const item = new Item({
      userId: req.userId,
      url: url || '',
      type: meta.type,
      title: meta.title,
      description: meta.description,
      thumbnail: meta.thumbnail,
      tags,
      embedding,
      domain: meta.domain,
      collectionId: req.body.collectionId || null
    });
    await item.save();
    console.log(`[PIPELINE] Stored: ${item._id} for user ${req.userId}`);

    // Step 6: Auto-clustering (user-scoped)
    runClustering(req.userId).catch(err => console.error('[CLUSTER]', err));

    const response = item.toObject();
    delete response.embedding;
    response.embeddingDimensions = embedding.length;
    res.status(201).json(response);
  } catch (err) {
    console.error('[PIPELINE] Error:', err);
    res.status(500).json({ error: 'Failed to save item: ' + err.message });
  }
});

// List items (user-scoped)
router.get('/', async (req, res) => {
  try {
    const { type, tag, collectionId, limit = 50 } = req.query;
    const filter = { userId: req.userId };
    if (type) filter.type = type;
    if (tag) filter.tags = tag;
    if (collectionId) filter.collectionId = collectionId;

    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-embedding');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get single item (verify ownership)
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const response = item.toObject();
    response.embeddingDimensions = item.embedding?.length || 0;
    response.hasEmbedding = item.embedding?.length > 0;
    delete response.embedding;
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Delete item (verify ownership)
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Related items (user-scoped)
router.get('/:id/related', async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (!item.embedding?.length) return res.json([]);

    const allItems = await Item.find({ _id: { $ne: item._id }, userId: req.userId });
    const related = findRelated(item.embedding, allItems, 5, item._id);
    res.json(related.map(r => ({
      ...r.item.toObject(),
      similarity: Math.round(r.score * 10000) / 100,
      embedding: undefined
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to find related items' });
  }
});

// Add highlight
router.post('/:id/highlights', async (req, res) => {
  try {
    const { text, note, color } = req.body;
    if (!text) return res.status(400).json({ error: 'Highlight text is required' });

    const item = await Item.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.highlights.push({ text, note: note || '', color: color || '#3B82F6' });
    await item.save();

    const response = item.toObject();
    delete response.embedding;
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add highlight' });
  }
});

// Delete highlight
router.delete('/:id/highlights/:highlightId', async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.highlights = item.highlights.filter(h => String(h._id) !== req.params.highlightId);
    await item.save();

    const response = item.toObject();
    delete response.embedding;
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete highlight' });
  }
});

// Update item
router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.collectionId !== undefined) updates.collectionId = req.body.collectionId;
    if (req.body.title) updates.title = req.body.title;
    if (req.body.tags) updates.tags = req.body.tags;

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true }
    ).select('-embedding');
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

module.exports = router;
