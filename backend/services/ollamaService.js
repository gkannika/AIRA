const fetch = require('node-fetch');
const logger = require('../utils/logger');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Thin client around a locally-running Ollama server. No API key required -
 * Ollama serves models entirely on localhost. If Ollama is unreachable
 * (not installed/started), callers should catch the error and fall back to
 * a template-based summary rather than failing the whole analysis.
 */
async function generate(prompt, { temperature = 0.3 } = {}) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature },
    }),
    timeout: 60000,
  });

  if (!res.ok) {
    throw new Error(`Ollama responded with status ${res.status}`);
  }

  const data = await res.json();
  return data.response ? data.response.trim() : '';
}

async function isOllamaAvailable() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 3000 });
    return res.ok;
  } catch (err) {
    logger.warn(`Ollama not reachable at ${OLLAMA_BASE_URL}: ${err.message}`);
    return false;
  }
}

module.exports = { generate, isOllamaAvailable, OLLAMA_MODEL };
