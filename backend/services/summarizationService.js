const { embedChunks } = require('./embeddingService');
const { topKSimilar } = require('./similarityService');
const ollama = require('./ollamaService');
const logger = require('../utils/logger');

/**
 * Orchestrates: chunk building -> embeddings -> similarity retrieval ->
 * Ollama generation, for every section of the report. Each generation call
 * only receives the top-K most relevant chunks (never the whole repo),
 * fulfilling the "hierarchical analysis, not blind upload" requirement.
 *
 * If Ollama is unreachable, every section falls back to a deterministic,
 * template-based summary built from the structured analysis data, so the
 * request still succeeds (with reduced narrative quality) instead of failing.
 */

function buildChunks({ languages, frameworks, technologies, parsedFiles }) {
  const chunks = [];
  chunks.push({
    id: 'stack',
    text: `Languages: ${languages.map((l) => l.name).join(', ')}. Frameworks: ${frameworks.join(', ') || 'none detected'}. Technologies: ${technologies.join(', ') || 'none detected'}.`,
  });
  for (const file of parsedFiles.slice(0, 200)) {
    const parts = [`File: ${file.path}`, `Language: ${file.language}`];
    if (file.classes?.length) parts.push(`Classes: ${file.classes.join(', ')}`);
    if (file.functions?.length) parts.push(`Functions: ${file.functions.slice(0, 15).join(', ')}`);
    if (file.imports?.length) parts.push(`Imports: ${file.imports.slice(0, 15).join(', ')}`);
    chunks.push({ id: file.path, text: parts.join(' | ') });
  }
  return chunks;
}

async function retrieveContext(query, embeddedChunks, k = 8) {
  const [queryEmbedding] = await embedChunks([{ id: '_query', text: query }]);
  const top = topKSimilar(queryEmbedding.vector, embeddedChunks, k);
  return top.map((c) => c.text).join('\n');
}

async function generateSection(query, embeddedChunks, promptBuilder, fallback) {
  if (embeddedChunks.length === 0) return fallback();
  try {
    const context = await retrieveContext(query, embeddedChunks);
    const prompt = promptBuilder(context);
    return await ollama.generate(prompt);
  } catch (err) {
    logger.warn(`Falling back to template summary (${err.message}).`);
    return fallback();
  }
}

async function generateRepositorySummary({ repoName, owner, languages, frameworks, technologies, parsedFiles, stats }) {
  const chunks = buildChunks({ languages, frameworks, technologies, parsedFiles });
  const ollamaAvailable = await ollama.isOllamaAvailable();
  const embeddedChunks = ollamaAvailable ? await embedChunks(chunks) : [];

  const overview = await generateSection(
    'project overview purpose and goals',
    embeddedChunks,
    (context) => `You are analyzing the GitHub repository "${owner}/${repoName}". Based on this context:\n${context}\n\nWrite a concise 3-4 sentence project overview explaining what this repository likely does and who it's for. Be direct and factual.`,
    () => `${owner}/${repoName} is a ${languages[0]?.name || 'multi-language'} project` +
      `${frameworks.length ? ` built with ${frameworks.slice(0, 3).join(', ')}` : ''}. ` +
      `It contains ${stats.totalFiles} analyzed files across ${stats.totalFolders} folders.`
  );

  const architecture = await generateSection(
    'architecture modules structure organization',
    embeddedChunks,
    (context) => `Based on this repository context:\n${context}\n\nDescribe the likely architecture and how modules relate to each other, in 3-5 sentences.`,
    () => `The codebase is organized into ${stats.totalFolders} folders. ` +
      `Primary language(s): ${languages.slice(0, 3).map((l) => l.name).join(', ') || 'unknown'}. ` +
      `${frameworks.length ? `It relies on ${frameworks.join(', ')} for its core functionality.` : ''}`
  );

  const techStackNarrative = await generateSection(
    'technology stack dependencies',
    embeddedChunks,
    (context) => `Based on this context:\n${context}\n\nSummarize the technology stack (languages, frameworks, notable dependencies) in 2-3 sentences.`,
    () => `Technologies detected: ${technologies.join(', ') || 'none detected'}. ` +
      `Frameworks: ${frameworks.join(', ') || 'none detected'}.`
  );

  const insightsRaw = await generateSection(
    'notable patterns risks and insights',
    embeddedChunks,
    (context) => `Based on this context:\n${context}\n\nList 3 brief, specific insights or notable observations about this repository as short bullet points (no numbering, one per line).`,
    () => [
      `Largest language by file count: ${languages[0]?.name || 'n/a'}.`,
      `${stats.totalFiles} files were analyzed (some files may have been skipped as binaries, build artifacts, or oversized).`,
      frameworks.length ? `Key frameworks in use: ${frameworks.join(', ')}.` : 'No common frameworks were detected from manifest files.',
    ].join('\n')
  );
  const insights = insightsRaw.split('\n').map((s) => s.replace(/^[-*]\s*/, '').trim()).filter(Boolean);

  const documentation = await generateSection(
    'README documentation setup usage',
    embeddedChunks,
    (context) => `Based on this repository context:\n${context}\n\nWrite a short AI-generated README section (Markdown) with headings for Overview, Tech Stack, and Getting Started. Be concise.`,
    () => `# ${repoName}\n\n## Overview\n${overview}\n\n## Tech Stack\n${techStackNarrative}\n\n## Getting Started\nClone the repository and install dependencies per the manifest files detected (${technologies.join(', ') || 'see repository for details'}).`
  );

  return {
    summary: { overview, architecture, insights, techStackNarrative },
    documentation,
    embeddedChunksCount: embeddedChunks.length,
  };
}

module.exports = { generateRepositorySummary, buildChunks };
