/**
 * Cosine similarity utilities used for semantic retrieval: given a query
 * embedding and a set of candidate chunk embeddings, return the top-K most
 * relevant chunks. This is how we avoid ever sending the whole repository
 * to the LLM - only the most relevant summaries/snippets for the section
 * currently being generated are retrieved and passed as context.
 */

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * embeddedChunks: [{ id, text, vector }]
 * queryVector: number[]
 * Returns the top `k` chunks sorted by descending similarity.
 */
function topKSimilar(queryVector, embeddedChunks, k = 5) {
  return embeddedChunks
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryVector, chunk.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

module.exports = { cosineSimilarity, topKSimilar };
