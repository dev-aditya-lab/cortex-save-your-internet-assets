const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// =============================================
// REAL EMBEDDING SYSTEM using transformers.js
// Model: all-MiniLM-L6-v2 (384 dimensions)
// =============================================

let embeddingPipeline = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    const { pipeline } = await import('@xenova/transformers');
    console.log('[AI] Loading embedding model (all-MiniLM-L6-v2)...');
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[AI] Embedding model loaded successfully');
  }
  return embeddingPipeline;
}

// Generate REAL 384-dim embedding using sentence transformer
async function generateEmbedding(text) {
  try {
    const input = text.substring(0, 512).trim();
    if (!input) return [];

    const pipe = await getEmbeddingPipeline();
    const output = await pipe(input, { pooling: 'mean', normalize: true });

    // Convert to plain array
    const embedding = Array.from(output.data);
    console.log(`[AI] Generated real embedding: ${embedding.length} dimensions, sample: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    return embedding;
  } catch (err) {
    console.error('[AI] Embedding generation failed:', err.message);
    return [];
  }
}

// =============================================
// COSINE SIMILARITY (real math)
// =============================================

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// =============================================
// NEAREST NEIGHBOR SEARCH
// =============================================

function findRelated(targetEmbedding, items, topK = 5, excludeId = null) {
  if (!targetEmbedding || targetEmbedding.length === 0) return [];

  const scored = items
    .filter(item => {
      if (!item.embedding || item.embedding.length === 0) return false;
      if (excludeId && String(item._id) === String(excludeId)) return false;
      return true;
    })
    .map(item => ({
      item,
      score: cosineSimilarity(targetEmbedding, item.embedding)
    }))
    .filter(s => s.score > 0.15) // real threshold for MiniLM embeddings
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

// Full similarity matrix for debug
function computeSimilarityMatrix(items) {
  const matrix = [];
  for (let i = 0; i < items.length; i++) {
    const row = [];
    for (let j = 0; j < items.length; j++) {
      if (i === j) {
        row.push(1.0);
      } else if (items[i].embedding?.length && items[j].embedding?.length) {
        row.push(cosineSimilarity(items[i].embedding, items[j].embedding));
      } else {
        row.push(0);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

// =============================================
// AI TAGGING (Groq LLM - this is real)
// =============================================

async function generateTags(title, description, contentText) {
  try {
    const text = `${title}. ${description}. ${contentText || ''}`.substring(0, 1500);
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a tagging assistant. Given content, return 3-6 relevant tags as a JSON array of lowercase strings. Only return the JSON array, nothing else. Example: ["javascript", "web development", "tutorial"]'
        },
        {
          role: 'user',
          content: `Generate tags for this content:\nTitle: ${title}\nDescription: ${description}\nContent: ${(contentText || '').substring(0, 500)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    const response = completion.choices[0]?.message?.content?.trim();
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) {
      return parsed.map(t => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 6);
    }
    return fallbackTags(title, description);
  } catch (err) {
    console.error('[AI] Groq tagging failed, using fallback:', err.message);
    return fallbackTags(title, description);
  }
}

// Fallback: real keyword extraction using TF frequency
function fallbackTags(title, description) {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'between',
    'through', 'after', 'before', 'above', 'below', 'and', 'but', 'or',
    'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'that', 'this',
    'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
    'she', 'they', 'them', 'what', 'which', 'who', 'how', 'when', 'where',
    'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some',
    'any', 'such', 'only', 'very', 'just', 'also', 'now', 'new', 'one',
    'two', 'get', 'got', 'make', 'know', 'use', 'used', 'using', ''
  ]);

  const text = `${title} ${description}`.toLowerCase();
  const words = text.match(/[a-z]{3,}/g) || [];
  const freq = {};
  words.forEach(w => {
    if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

// Preload the model at startup
function preloadModel() {
  getEmbeddingPipeline().catch(err => {
    console.error('[AI] Failed to preload model:', err.message);
  });
}

module.exports = {
  generateEmbedding,
  cosineSimilarity,
  findRelated,
  computeSimilarityMatrix,
  generateTags,
  preloadModel
};
