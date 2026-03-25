const Item = require('../models/Item');
const Collection = require('../models/Collection');
const { cosineSimilarity } = require('./ai');

const CLUSTER_THRESHOLD = 0.45;

function buildSimilarityGraph(items) {
  const graph = new Map();
  for (const item of items) graph.set(String(item._id), []);

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

function findClusters(graph) {
  const visited = new Set();
  const clusters = [];
  for (const [nodeId] of graph) {
    if (visited.has(nodeId)) continue;
    const cluster = [];
    const queue = [nodeId];
    visited.add(nodeId);
    while (queue.length > 0) {
      const current = queue.shift();
      cluster.push(current);
      for (const { id } of (graph.get(current) || [])) {
        if (!visited.has(id)) { visited.add(id); queue.push(id); }
      }
    }
    if (cluster.length >= 2) clusters.push(cluster);
  }
  return clusters;
}

function getClusterLabel(items) {
  const tagFreq = {};
  items.forEach(item => (item.tags || []).forEach(tag => { tagFreq[tag] = (tagFreq[tag] || 0) + 1; }));
  const sorted = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]);
  if (sorted.length >= 2) return sorted.slice(0, 2).map(([t]) => t).join(' & ');
  if (sorted.length === 1) return sorted[0][0];
  return items[0]?.title?.substring(0, 30) || 'Cluster';
}

const CLUSTER_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#be185d', '#4338ca'];

async function runClustering(userId) {
  try {
    const items = await Item.find({ userId, embedding: { $exists: true, $not: { $size: 0 } } })
      .select('_id title tags embedding');
    if (items.length < 2) return { clusters: [], assignments: {} };

    const graph = buildSimilarityGraph(items);
    const clusterIds = findClusters(graph);
    const itemMap = {};
    items.forEach(i => { itemMap[String(i._id)] = i; });

    const assignments = {};
    for (let i = 0; i < clusterIds.length; i++) {
      const clusterItemIds = clusterIds[i];
      const clusterItems = clusterItemIds.map(id => itemMap[id]).filter(Boolean);
      const label = getClusterLabel(clusterItems);
      const autoName = `Auto: ${label}`;

      let collection = await Collection.findOne({ name: autoName, _isAuto: true, userId });
      if (!collection) {
        collection = new Collection({ userId, name: autoName, description: `Auto-generated cluster`, color: CLUSTER_COLORS[i % CLUSTER_COLORS.length], _isAuto: true });
        await collection.save();
      }

      for (const itemId of clusterItemIds) {
        const item = await Item.findById(itemId);
        if (item && !item.collectionId) {
          item.collectionId = collection._id;
          await item.save();
          assignments[itemId] = { collection: autoName };
        }
      }
    }
    return { clusters: clusterIds.length, assignments };
  } catch (err) {
    console.error('[CLUSTER]', err.message);
    return { clusters: 0, error: err.message };
  }
}

async function getClusterState(userId) {
  const items = await Item.find({ userId, embedding: { $exists: true, $not: { $size: 0 } } })
    .select('_id title tags embedding type');
  if (items.length < 2) return { clusters: [], itemCount: items.length };

  const graph = buildSimilarityGraph(items);
  const clusterIds = findClusters(graph);
  const itemMap = {};
  items.forEach(i => { itemMap[String(i._id)] = i; });

  const clusters = clusterIds.map((ids, i) => {
    const clusterItems = ids.map(id => itemMap[id]).filter(Boolean);
    let totalSim = 0, count = 0;
    for (let a = 0; a < clusterItems.length; a++)
      for (let b = a + 1; b < clusterItems.length; b++)
        if (clusterItems[a].embedding?.length && clusterItems[b].embedding?.length) {
          totalSim += cosineSimilarity(clusterItems[a].embedding, clusterItems[b].embedding); count++;
        }

    return {
      index: i, label: getClusterLabel(clusterItems), size: ids.length,
      avgSimilarity: count > 0 ? Math.round(totalSim / count * 10000) / 10000 : 0,
      items: clusterItems.map(it => ({ id: String(it._id), title: it.title, type: it.type, tags: it.tags }))
    };
  });

  return { clusters, threshold: CLUSTER_THRESHOLD, totalItems: items.length,
    clusteredItems: clusterIds.reduce((s, c) => s + c.length, 0),
    unclusteredItems: items.length - clusterIds.reduce((s, c) => s + c.length, 0) };
}

module.exports = { runClustering, getClusterState, CLUSTER_THRESHOLD };
