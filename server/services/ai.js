const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Generate tags from content using Groq LLM
async function generateTags(title, description) {
  try {
    const text = `${title}. ${description}`.substring(0, 1000);
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a tagging assistant. Given content, return 3-6 relevant tags as a JSON array of lowercase strings. Only return the JSON array, nothing else. Example: ["javascript", "web development", "tutorial"]'
        },
        {
          role: 'user',
          content: `Generate tags for this content:\nTitle: ${title}\nDescription: ${description}`
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
    console.error('AI tagging failed, using fallback:', err.message);
    return fallbackTags(title, description);
  }
}

// Fallback: simple keyword extraction
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

// Generate embedding using Groq
async function generateEmbedding(text) {
  try {
    const input = text.substring(0, 500);
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an embedding generator. Given text, return a JSON array of exactly 64 floating point numbers between -1 and 1 that represent the semantic meaning of the text. Only return the JSON array, nothing else.'
        },
        {
          role: 'user',
          content: input
        }
      ],
      temperature: 0,
      max_tokens: 800
    });

    const content = response.choices[0]?.message?.content?.trim();
    const embedding = JSON.parse(content);
    if (Array.isArray(embedding) && embedding.length === 64) {
      return embedding.map(Number);
    }
    return simpleEmbedding(input);
  } catch (err) {
    console.error('AI embedding failed, using fallback:', err.message);
    return simpleEmbedding(text);
  }
}

// Fallback: simple hash-based embedding
function simpleEmbedding(text) {
  const dim = 64;
  const embedding = new Array(dim).fill(0);
  const words = text.toLowerCase().split(/\s+/);

  words.forEach((word, i) => {
    for (let j = 0; j < word.length; j++) {
      const idx = (word.charCodeAt(j) * (i + 1) * (j + 1)) % dim;
      embedding[idx] += 1 / words.length;
    }
  });

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dim; i++) embedding[i] /= magnitude;
  }

  return embedding;
}

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// Find related items using cosine similarity
function findRelated(targetEmbedding, items, topK = 5, excludeId = null) {
  if (!targetEmbedding || targetEmbedding.length === 0) return [];

  const scored = items
    .filter(item => item.embedding && item.embedding.length > 0 && String(item._id) !== String(excludeId))
    .map(item => ({
      item,
      score: cosineSimilarity(targetEmbedding, item.embedding)
    }))
    .filter(s => s.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

module.exports = {
  generateTags,
  generateEmbedding,
  cosineSimilarity,
  findRelated
};
