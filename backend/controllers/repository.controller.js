const store = require('../services/repositoryStore');
const { startAnalysis, getFileExplanation } = require('../services/analysisOrchestrator');

function notFound(res, id) {
  return res.status(404).json({ error: { code: 'REPO_NOT_FOUND', message: `No repository analysis found for id ${id}` } });
}

async function analyze(req, res, next) {
  try {
    const { githubUrl } = req.body || {};
    if (!githubUrl) {
      return res.status(400).json({ error: { code: 'MISSING_URL', message: 'githubUrl is required in the request body.' } });
    }
    const id = await startAnalysis(githubUrl);
    res.status(202).json({ id, status: 'queued' });
  } catch (err) {
    next(err);
  }
}

async function getRepository(req, res, next) {
  try {
    const repo = await store.findById(req.params.id);
    if (!repo) return notFound(res, req.params.id);
    const { _parsedFilesInternal, ...safe } = repo;
    res.json(safe);
  } catch (err) {
    next(err);
  }
}

async function getTree(req, res, next) {
  try {
    const repo = await store.findById(req.params.id);
    if (!repo) return notFound(res, req.params.id);
    res.json({ tree: repo.tree || null, status: repo.status });
  } catch (err) {
    next(err);
  }
}

async function getDependencies(req, res, next) {
  try {
    const repo = await store.findById(req.params.id);
    if (!repo) return notFound(res, req.params.id);
    res.json({ dependencyGraph: repo.dependencyGraph || null, status: repo.status });
  } catch (err) {
    next(err);
  }
}

async function getSummary(req, res, next) {
  try {
    const repo = await store.findById(req.params.id);
    if (!repo) return notFound(res, req.params.id);
    res.json({
      summary: repo.summary || null,
      languages: repo.languages || [],
      frameworks: repo.frameworks || [],
      technologies: repo.technologies || [],
      stats: repo.stats || null,
      status: repo.status,
    });
  } catch (err) {
    next(err);
  }
}

async function getDocumentation(req, res, next) {
  try {
    const repo = await store.findById(req.params.id);
    if (!repo) return notFound(res, req.params.id);
    res.json({ documentation: repo.documentation || null, status: repo.status });
  } catch (err) {
    next(err);
  }
}

async function getFileExplanationHandler(req, res, next) {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: { code: 'MISSING_PATH', message: 'Query param "path" is required.' } });
    }
    const repo = await store.findById(req.params.id);
    if (!repo) return notFound(res, req.params.id);

    const explanation = await getFileExplanation(req.params.id, filePath);
    if (explanation === null) return notFound(res, req.params.id);
    res.json({ path: filePath, explanation });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  analyze,
  getRepository,
  getTree,
  getDependencies,
  getSummary,
  getDocumentation,
  getFileExplanationHandler,
};
