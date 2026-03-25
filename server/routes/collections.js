const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');
const Item = require('../models/Item');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Create collection
router.post('/', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Collection name is required' });

    const collection = new Collection({ userId: req.userId, name, description, color });
    await collection.save();
    res.status(201).json(collection);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// List collections with item counts (user-scoped)
router.get('/', async (req, res) => {
  try {
    const collections = await Collection.find({ userId: req.userId }).sort({ createdAt: -1 });
    const withCounts = await Promise.all(
      collections.map(async (col) => {
        const itemCount = await Item.countDocuments({ collectionId: col._id, userId: req.userId });
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
    const collection = await Collection.findOne({ _id: req.params.id, userId: req.userId });
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const items = await Item.find({ collectionId: collection._id, userId: req.userId })
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
    const collection = await Collection.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { name, description, color },
      { new: true }
    );
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    res.json(collection);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

// Delete collection
router.delete('/:id', async (req, res) => {
  try {
    await Item.updateMany({ collectionId: req.params.id, userId: req.userId }, { collectionId: null });
    const result = await Collection.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!result) return res.status(404).json({ error: 'Collection not found' });
    res.json({ message: 'Collection deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// Add item to collection
router.post('/:id/items', async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = await Item.findOneAndUpdate(
      { _id: itemId, userId: req.userId },
      { collectionId: req.params.id },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add item to collection' });
  }
});

// Remove item from collection
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.itemId, userId: req.userId },
      { collectionId: null },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item from collection' });
  }
});

module.exports = router;
