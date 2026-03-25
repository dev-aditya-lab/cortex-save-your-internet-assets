const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { fetchMetadata } = require('../services/metadata');
const { generateTags, generateEmbedding, findRelated } = require('../services/ai');

// Save a new item
router.post('/', async (req, res) => {
  try {
    const { url, title, description, type } = req.body;

    if (!url && !title) {
      return res.status(400).json({ error: 'URL or title is required' });
    }

    // Fetch metadata if URL provided
    let meta = { title: title || '', description: description || '', thumbnail: '', type: type || 'other', domain: '' };
    if (url) {
      meta = await fetchMetadata(url);
    }

    // Override with provided values
    if (title) meta.title = title;
    if (description) meta.description = description;
    if (type) meta.type = type;

    // Generate tags and embedding in parallel
    const textForAI = `${meta.title}. ${meta.description}`;
    const [tags, embedding] = await Promise.all([
      generateTags(meta.title, meta.description),
      generateEmbedding(textForAI)
    ]);

    const item = new Item({
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
    res.status(201).json(item);
  } catch (err) {
    console.error('Error saving item:', err);
    res.status(500).json({ error: 'Failed to save item' });
  }
});

// List all items
router.get('/', async (req, res) => {
  try {
    const { type, tag, collectionId, limit = 50 } = req.query;
    const filter = {};
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

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get related items
router.get('/:id/related', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const allItems = await Item.find({ _id: { $ne: item._id } });
    const related = findRelated(item.embedding, allItems, 5, item._id);

    res.json(related.map(r => ({
      ...r.item.toObject(),
      similarity: Math.round(r.score * 100),
      embedding: undefined
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to find related items' });
  }
});

// Add highlight to item
router.post('/:id/highlights', async (req, res) => {
  try {
    const { text, note, color } = req.body;
    if (!text) return res.status(400).json({ error: 'Highlight text is required' });

    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.highlights.push({ text, note: note || '', color: color || '#3B82F6' });
    await item.save();

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add highlight' });
  }
});

// Delete highlight from item
router.delete('/:id/highlights/:highlightId', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.highlights = item.highlights.filter(h => String(h._id) !== req.params.highlightId);
    await item.save();

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete highlight' });
  }
});

// Update item (move to collection, update tags, etc.)
router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.collectionId !== undefined) updates.collectionId = req.body.collectionId;
    if (req.body.title) updates.title = req.body.title;
    if (req.body.tags) updates.tags = req.body.tags;

    const item = await Item.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-embedding');
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

module.exports = router;
