const path = require('path');
const fs = require('fs-extra');

/**
 * Returns a canned, realistic analysis so the entire frontend (dashboard,
 * explorer, architecture diagram) can be exercised without cloning a repo,
 * running Tree-sitter, or having Ollama/MongoDB installed. Used whenever
 * MOCK_MODE=true (the default).
 */
async function getMockAnalysis(githubUrl) {
  const samplePath = path.join(__dirname, '..', 'data', 'mock', 'sample-repo-analysis.json');
  const sample = await fs.readJson(samplePath);
  return {
    ...sample,
    githubUrl,
  };
}

module.exports = { getMockAnalysis };
