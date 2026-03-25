const Item = require('../models/Item');
const Collection = require('../models/Collection');
const { cosineSimilarity } = require('./ai');

// =============================================
// REAL CLUSTERING: Threshold-based grouping
// Groups items with cosine similarity > threshold
// =============================================

const CLUSTER_THRESHOLD = 0.45; // items above this are "same cluster"

// Build adjacency list from similarity
function buildSimilarityGraph(items) {
  const graph = new Map();

  for (const item of items) {
    graph.set(String(item._id), []);
  }

  for (let i = 0; i < items.length; i++) {
    if (!items[i].embedding?.length) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (!items[j].embedding?.length) continue;

      const sim = cosineSimilarity(items[i].embedding, items[j].embedding);
      if (sim >= CLUSTER_THRESHOLD) {
        graph.get(String(items[i]._id)).push({ id: String(items[j]._id), sim });
        graph.get(String(items[j]._id)).push({ id: String(items[i]._id), sim });
      }
    }
  }

  return graph;
}

// Connected components = clusters
function findClusters(graph) {
  const visited = new Set();
  const clusters = [];

  for (const [nodeId] of graph) {
    if (visited.has(nodeId)) continue;

    // BFS to find connected component
    const cluster = [];
    const queue = [nodeId];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift();
      cluster.push(current);

      const neighbors = graph.get(current) || [];
      for (const { id } of neighbors) {
        if (!visited.has(id)) {
          visited.add(id);
          queue.push(id);
        }
      }
    }

    if (cluster.length >= 2) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

// Determine cluster label from common tags
function getClusterLabel(items) {
  const tagFreq = {};
  items.forEach(item => {
    (item.tags || []).forEach(tag => {
      tagFreq[tag] = (tagFreq[tag] || 0) + 1;
    });
  });

  const sorted = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]);
  if (sorted.length >= 2) {
    return sorted.slice(0, 2).map(([t]) => t).join(' & ');
  } else if (sorted.length === 1) {
    return sorted[0][0];
  }
  return items[0]?.title?.substring(0, 30) || 'Cluster';
}

// Colors for auto-collections
const CLUSTER_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#4338ca'];

// Main clustering function
// Run after each new item is saved
async function runClustering() {
  try {
    const items = await Item.find({ embedding: { $exists: true, $not: { $size: 0 } } })
      .select('_id title tags embedding');

    if (items.length < 2) {
      console.log('[CLUSTER] Not enough items for clustering');
      return { clusters: [], assignments: {} };
    }

    const graph = buildSimilarityGraph(items);
    const clusterIds = findClusters(graph);

    console.log(`[CLUSTER] Found ${clusterIds.length} clusters from ${items.length} items`);

    // Build item lookup
    const itemMap = {};
    items.forEach(i => { itemMap[String(i._id)] = i; });

    // Get or create auto-collections for each cluster
    const assignments = {};
    for (let i = 0; i < clusterIds.length; i++) {
      const clusterItemIds = clusterIds[i];
      const clusterItems = clusterItemIds.map(id => itemMap[id]).filter(Boolean);
      const label = getClusterLabel(clusterItems);
      const autoName = `Auto: ${label}`;

      // Find or create the auto-collection
      let collection = await Collection.findOne({ name: autoName, _isAuto: true });
      if (!collection) {
        collection = new Collection({
          name: autoName,
          description: `Auto-generated cluster of ${clusterItems.length} related items`,
          color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
          _isAuto: true
        });
        await collection.save();
        console.log(`[CLUSTER] Created auto-collection: "${autoName}"`);
      }

      // Assign items to this collection (only if not manually assigned)
      for (const itemId of clusterItemIds) {
        const item = await Item.findById(itemId);
        if (item && !item.collectionId) {
          item.collectionId = collection._id;
          await item.save();
          assignments[itemId] = { collection: autoName, collectionId: String(collection._id) };
        }
      }
    }

    return {
      clusters: clusterIds.map((ids, i) => ({
        index: i,
        size: ids.length,
        items: ids,
        label: getClusterLabel(ids.map(id => itemMap[id]).filter(Boolean))
      })),
      assignments,
      threshold: CLUSTER_THRESHOLD,
      totalItems: items.length
    };
  } catch (err) {
    console.error('[CLUSTER] Clustering failed:', err.message);
    return { clusters: [], assignments: {}, error: err.message };
  }
}

// Get current cluster state for debug
async function getClusterState() {
  const items = await Item.find({ embedding: { $exists: true, $not: { $size: 0 } } })
    .select('_id title tags embedding type');

  if (items.length < 2) return { clusters: [], itemCount: items.length };

  const graph = buildSimilarityGraph(items);
  const clusterIds = findClusters(graph);

  const itemMap = {};
  items.forEach(i => { itemMap[String(i._id)] = i; });

  // Compute pairwise similarities for each cluster
  const clusters = clusterIds.map((ids, i) => {
    const clusterItems = ids.map(id => itemMap[id]).filter(Boolean);
    const label = getClusterLabel(clusterItems);

    // Compute average intra-cluster similarity
    let totalSim = 0, count = 0;
    for (let a = 0; a < clusterItems.length; a++) {
      for (let b = a + 1; b < clusterItems.length; b++) {
        if (clusterItems[a].embedding?.length && clusterItems[b].embedding?.length) {
          totalSim += cosineSimilarity(clusterItems[a].embedding, clusterItems[b].embedding);
          count++;
        }
      }
    }
    const avgSimilarity = count > 0 ? totalSim / count : 0;

    return {
      index: i,
      label,
      size: ids.length,
      avgSimilarity: Math.round(avgSimilarity * 10000) / 10000,
      items: clusterItems.map(it => ({
        id: String(it._id),
        title: it.title,
        type: it.type,
        tags: it.tags
      }))
    };
  });

  return {
    clusters,
    threshold: CLUSTER_THRESHOLD,
    totalItems: items.length,
    clusteredItems: clusterIds.reduce((sum, c) => sum + c.length, 0),
    unclusteredItems: items.length - clusterIds.reduce((sum, c) => sum + c.length, 0)
  };
}

module.exports = { runClustering, getClusterState, CLUSTER_THRESHOLD };
