const logger = require('../utils/logger');

/**
 * Local sentence-embedding generation via @xenova/transformers, which runs
 * a Sentence-Transformers model (all-MiniLM-L6-v2 by default) entirely
 * in-process - no API key, no network calls after the first model download.
 *
 * The pipeline is lazy-loaded once and reused across requests.
 */
let embedderPromise = null;

async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      try {
        const { pipeline } = await import('@xenova/transformers');
        return await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      } catch (err) {
        logger.warn(`Could not load local embedding model (${err.message}). Falling back to a hashing-based pseudo-embedding.`);
        return null;
      }
    })();
  }
  return embedderPromise;
}

/**
 * Deterministic, dependency-free fallback: a simple bag-of-words hashing
 * "embedding". Not semantically rich, but keeps similarity search working
 * end-to-end when the transformer model can't be loaded (e.g. no network
 * access to download model weights on first run).
 */
function hashEmbedding(text, dims = 256) {
  const vec = new Array(dims).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9_]+/g) || [];
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    vec[hash % dims] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

/**
 * Embeds an array of text chunks: [{ id, text }] -> [{ id, text, vector }]
 */
async function embedChunks(chunks) {
  const embedder = await getEmbedder();
  const results = [];
  for (const chunk of chunks) {
    if (embedder) {
      const output = await embedder(chunk.text, { pooling: 'mean', normalize: true });
      results.push({ id: chunk.id, text: chunk.text, vector: Array.from(output.data) });
    } else {
      results.push({ id: chunk.id, text: chunk.text, vector: hashEmbedding(chunk.text) });
    }
  }
  return results;
}

module.exports = { embedChunks };
