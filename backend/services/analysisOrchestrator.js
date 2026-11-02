const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const store = require('./repositoryStore');
const { cloneRepository, cleanupRepository, parseGithubUrl, RepoAnalysisError } = require('./cloneService');
const { traverseRepository } = require('./traversalService');
const { detectTechnologies } = require('./languageDetector');
const { initTreeSitter, parseFile } = require('./treeSitterParser');
const { buildDependencyGraph } = require('./dependencyGraphService');
const { toMermaidFlowchart } = require('./mermaidService');
const { generateRepositorySummary } = require('./summarizationService');
const { explainFile } = require('./fileExplanationService');
const { getMockAnalysis } = require('./mockDataService');

const MOCK_MODE = () => process.env.MOCK_MODE === 'true';

/**
 * Kicks off analysis for a repository and returns immediately with a
 * queued repository id; the actual work happens asynchronously and status
 * is polled via GET /api/repository/:id. This mirrors how a real, possibly
 * slow (clone + parse + LLM) pipeline should behave.
 */
async function startAnalysis(githubUrl) {
  const id = uuidv4();

  if (MOCK_MODE()) {
    const { owner, name } = safeParse(githubUrl);
    await store.create({ _id: id, githubUrl, owner, name, status: 'queued', statusMessage: 'Queued (mock mode)' });
    // Simulate async completion shortly after, like a real pipeline would.
    setTimeout(() => runMockPipeline(id, githubUrl).catch((err) => logger.error(err)), 400);
    return id;
  }

  const { owner, name } = parseGithubUrl(githubUrl); // throws INVALID_URL synchronously if malformed
  await store.create({ _id: id, githubUrl, owner, name, status: 'queued', statusMessage: 'Queued' });
  runRealPipeline(id, githubUrl).catch((err) => logger.error(`Analysis ${id} failed: ${err.message}`));
  return id;
}

function safeParse(githubUrl) {
  try {
    return parseGithubUrl(githubUrl);
  } catch (_) {
    return { owner: 'unknown', name: 'unknown' };
  }
}

async function runMockPipeline(id, githubUrl) {
  await store.updateById(id, { status: 'analyzing', statusMessage: 'Analyzing repository (mock data)...' });
  const mock = await getMockAnalysis(githubUrl);
  await store.updateById(id, {
    status: 'completed',
    statusMessage: 'Analysis complete.',
    completedAt: new Date(),
    name: mock.name,
    owner: mock.owner,
    stats: mock.stats,
    languages: mock.languages,
    frameworks: mock.frameworks,
    technologies: mock.technologies,
    configFiles: mock.configFiles,
    tree: mock.tree,
    fileExplanations: mock.fileExplanations,
    dependencyGraph: mock.dependencyGraph,
    summary: mock.summary,
    documentation: mock.documentation,
  });
}

async function runRealPipeline(id, githubUrl) {
  let localPath;
  try {
    await store.updateById(id, { status: 'cloning', statusMessage: 'Cloning repository...' });
    const cloneResult = await cloneRepository(githubUrl, {
      timeoutMs: Number(process.env.CLONE_TIMEOUT_MS) || 120000,
    });
    localPath = cloneResult.localPath;

    await store.updateById(id, { status: 'scanning', statusMessage: 'Scanning files (BFS traversal)...' });
    const { tree, files, totalFolders } = await traverseRepository(localPath, {
      maxFiles: Number(process.env.MAX_FILES_TO_PARSE) || 2000,
    });

    const { languages, frameworks, technologies, configFiles } = await detectTechnologies(files);

    await store.updateById(id, { status: 'parsing', statusMessage: 'Parsing source files with Tree-sitter...' });
    await initTreeSitter();

    const parsedFiles = [];
    let totalLinesOfCode = 0;
    for (const file of files) {
      try {
        const parsed = await parseFile(file);
        if (parsed) {
          parsedFiles.push({ path: file.path, name: file.name, ...parsed });
          totalLinesOfCode += parsed.lineCount || 0;
        }
      } catch (err) {
        logger.warn(`Parse error for ${file.path}, skipping: ${err.message}`);
      }
    }

    const dependencyGraph = buildDependencyGraph(parsedFiles);
    const mermaid = toMermaidFlowchart(dependencyGraph);

    await store.updateById(id, { status: 'analyzing', statusMessage: 'Generating AI summary (embeddings + Ollama)...' });
    const stats = {
      totalFiles: files.length,
      totalFolders,
      totalLinesOfCode,
      sizeMB: Math.round((files.reduce((s, f) => s + (f.size || 0), 0) / (1024 * 1024)) * 100) / 100,
    };

    const { summary, documentation } = await generateRepositorySummary({
      repoName: cloneResult.name,
      owner: cloneResult.owner,
      languages,
      frameworks,
      technologies,
      parsedFiles,
      stats,
    });

    // Per-file explanations are generated lazily (on demand via the explorer
    // endpoint) rather than for every file up front, to keep initial
    // analysis fast - see controllers/repository.controller.js `getFileExplanation`.
    // Store the parsed metadata so on-demand explanation has context.
    await store.updateById(id, {
      status: 'completed',
      statusMessage: 'Analysis complete.',
      completedAt: new Date(),
      stats,
      languages,
      frameworks,
      technologies,
      configFiles,
      tree,
      dependencyGraph: { ...dependencyGraph, mermaid },
      summary,
      documentation,
      _parsedFilesInternal: parsedFiles, // not exposed directly by the tree/summary endpoints
    });
  } catch (err) {
    logger.error(`Analysis ${id} failed: ${err.message}`);
    await store.updateById(id, {
      status: 'failed',
      statusMessage: 'Analysis failed.',
      error: { code: err.code || 'ANALYSIS_ERROR', message: err.message },
    });
  } finally {
    await cleanupRepository(localPath);
  }
}

async function getFileExplanation(repoId, filePath) {
  const repo = await store.findById(repoId);
  if (!repo) return null;
  if (repo.fileExplanations && repo.fileExplanations[filePath]) {
    return repo.fileExplanations[filePath];
  }
  const parsedInfo = (repo._parsedFilesInternal || []).find((f) => f.path === filePath);
  const fileInfo = { path: filePath, name: filePath.split('/').pop() };
  return explainFile(fileInfo, parsedInfo);
}

module.exports = { startAnalysis, getFileExplanation };
