const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');
const Item = require('../models/Item');

// Create collection
router.post('/', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Collection name is required' });

    const collection = new Collection({ name, description, color });
    await collection.save();
    res.status(201).json(collection);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// List collections with item counts
router.get('/', async (req, res) => {
  try {
    const collections = await Collection.find().sort({ createdAt: -1 });
    const withCounts = await Promise.all(
      collections.map(async (col) => {
        const itemCount = await Item.countDocuments({ collectionId: col._id });
        return { ...col.toObject(), itemCount };
      })
    );
    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// Get single collection
router.get('/:id', async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const items = await Item.find({ collectionId: collection._id })
      .sort({ createdAt: -1 })
      .select('-embedding');

    res.json({ ...collection.toObject(), items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// Update collection
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
      { name, description, color },
      { new: true }
    );
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    res.json(collection);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

// Delete collection (unlinks items, doesn't delete them)
router.delete('/:id', async (req, res) => {
  try {
    await Item.updateMany({ collectionId: req.params.id }, { collectionId: null });
    await Collection.findByIdAndDelete(req.params.id);
    res.json({ message: 'Collection deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// Add item to collection
router.post('/:id/items', async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = await Item.findByIdAndUpdate(itemId, { collectionId: req.params.id }, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item to collection' });
  }
});

// Remove item from collection
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.itemId, { collectionId: null }, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item from collection' });
  }
});

module.exports = router;
