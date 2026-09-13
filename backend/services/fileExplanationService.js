const ollama = require('./ollamaService');
const logger = require('../utils/logger');

/**
 * Generates a short, human-readable explanation for a single file or folder,
 * used by the File/Folder Explorer page. Falls back to a structural
 * template (based on parsed functions/classes/imports) if Ollama is
 * unavailable, so the explorer always returns something useful.
 */
async function explainFile(fileInfo, parsedInfo) {
  const fallback = () => {
    if (!parsedInfo) {
      return `${fileInfo.name} is a supporting file in this repository. No code-level structure was extracted (it may be a config, data, or non-source file).`;
    }
    const parts = [`${fileInfo.name} is a ${parsedInfo.language || 'source'} file with ${parsedInfo.lineCount || '?'} lines.`];
    if (parsedInfo.classes?.length) parts.push(`It defines ${parsedInfo.classes.length} class(es): ${parsedInfo.classes.slice(0, 5).join(', ')}.`);
    if (parsedInfo.functions?.length) parts.push(`It defines ${parsedInfo.functions.length} function(s), including: ${parsedInfo.functions.slice(0, 5).join(', ')}.`);
    if (parsedInfo.imports?.length) parts.push(`It imports/depends on: ${parsedInfo.imports.slice(0, 5).join(', ')}.`);
    return parts.join(' ');
  };

  try {
    const available = await ollama.isOllamaAvailable();
    if (!available) throw new Error('Ollama not reachable');
    const context = [
      `File: ${fileInfo.path}`,
      parsedInfo?.language ? `Language: ${parsedInfo.language}` : null,
      parsedInfo?.classes?.length ? `Classes: ${parsedInfo.classes.join(', ')}` : null,
      parsedInfo?.functions?.length ? `Functions: ${parsedInfo.functions.join(', ')}` : null,
      parsedInfo?.imports?.length ? `Imports: ${parsedInfo.imports.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Given this information about a file in a code repository:\n${context}\n\nExplain in 2-3 plain-language sentences what this file is likely responsible for.`;
    return await ollama.generate(prompt);
  } catch (err) {
    logger.warn(`File explanation fallback for ${fileInfo.path}: ${err.message}`);
    return fallback();
  }
}

module.exports = { explainFile };
