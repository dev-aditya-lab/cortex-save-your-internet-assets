const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { fetchMetadata } = require('../services/metadata');
const { generateTags, generateEmbedding, findRelated } = require('../services/ai');
const { runClustering } = require('../services/clustering');

// =============================================
// SAVE NEW ITEM - Full Intelligence Pipeline
// =============================================
// 1. Content Extraction (metadata)
// 2. Metadata Parsing (title, desc, thumbnail)
// 3. Embedding Generation (real 384-dim)
// 4. Tag Generation (Groq LLM)
// 5. Storage (MongoDB)
// 6. Similarity Linking (auto-clustering)

router.post('/', async (req, res) => {
  try {
    const { url, title, description, type } = req.body;

    if (!url && !title) {
      return res.status(400).json({ error: 'URL or title is required' });
    }

    console.log(`\n[PIPELINE] === Starting save pipeline ===`);

    // Step 1 & 2: Content/Metadata extraction
    console.log('[PIPELINE] Step 1-2: Extracting metadata...');
    let meta = { title: title || '', description: description || '', thumbnail: '', type: type || 'other', domain: '', contentText: '' };
    if (url) {
      meta = await fetchMetadata(url);
    }
    if (title) meta.title = title;
    if (description) meta.description = description;
    if (type) meta.type = type;
    console.log(`[PIPELINE] Extracted: "${meta.title}" (${meta.type})`);

    // Step 3: Generate REAL embedding
    console.log('[PIPELINE] Step 3: Generating real embedding...');
    const textForEmbedding = meta.contentText || `${meta.title}. ${meta.description}`;
    const embedding = await generateEmbedding(textForEmbedding);
    console.log(`[PIPELINE] Embedding: ${embedding.length} dimensions`);

    // Step 4: Generate tags (Groq AI or fallback)
    console.log('[PIPELINE] Step 4: Generating tags...');
    const tags = await generateTags(meta.title, meta.description, meta.contentText);
    console.log(`[PIPELINE] Tags: [${tags.join(', ')}]`);

    // Step 5: Store in MongoDB
    console.log('[PIPELINE] Step 5: Storing...');
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
    console.log(`[PIPELINE] Stored: ${item._id}`);

    // Step 6: Similarity linking (auto-clustering)
    console.log('[PIPELINE] Step 6: Running auto-clustering...');
    const clusterResult = await runClustering();
    console.log(`[PIPELINE] Clusters found: ${clusterResult.clusters?.length || 0}`);
    console.log('[PIPELINE] === Pipeline complete ===\n');

    // Return item without embedding (too large for response)
    const response = item.toObject();
    delete response.embedding;
    response.embeddingDimensions = embedding.length;
    response.pipelineSteps = ['content_extraction', 'metadata_parsing', 'embedding_generation', 'tag_generation', 'storage', 'similarity_linking'];

    res.status(201).json(response);
  } catch (err) {
    console.error('[PIPELINE] Error:', err);
    res.status(500).json({ error: 'Failed to save item: ' + err.message });
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

// Get single item (include embedding dimensions in response)
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
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

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get related items (real embedding-based search)
router.get('/:id/related', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (!item.embedding || item.embedding.length === 0) {
      return res.json([]);
    }

    const allItems = await Item.find({ _id: { $ne: item._id } });
    const related = findRelated(item.embedding, allItems, 5, item._id);

    res.json(related.map(r => ({
      ...r.item.toObject(),
      similarity: Math.round(r.score * 10000) / 100, // real score, 2 decimal places
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

    const response = item.toObject();
    delete response.embedding;
    res.status(201).json(response);
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

    const item = await Item.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-embedding');
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

module.exports = router;
