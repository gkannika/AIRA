const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const simpleGit = require('simple-git');
const logger = require('../utils/logger');

const GITHUB_URL_REGEX = /^https?:\/\/(www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(\.git)?\/?$/i;

class RepoAnalysisError extends Error {
  constructor(message, code = 'ANALYSIS_ERROR', status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Validates that a string looks like a public GitHub repository URL and
 * extracts { owner, name }.
 */
function parseGithubUrl(url) {
  const match = String(url || '').trim().match(GITHUB_URL_REGEX);
  if (!match) {
    throw new RepoAnalysisError(
      'That does not look like a valid public GitHub repository URL (expected https://github.com/<owner>/<repo>).',
      'INVALID_URL'
    );
  }
  return { owner: match[2], name: match[3] };
}

/**
 * Shallow-clones a repository into a fresh temp directory.
 * Returns the local path. Caller is responsible for cleanup (fs.remove).
 */
async function cloneRepository(githubUrl, { timeoutMs = 120000 } = {}) {
  const { owner, name } = parseGithubUrl(githubUrl);
  const workDir = path.join(os.tmpdir(), 'repo-intel', `${owner}-${name}-${uuidv4()}`);
  await fs.ensureDir(workDir);

  const git = simpleGit({ timeout: { block: timeoutMs } });

  try {
    logger.info(`Cloning ${githubUrl} into ${workDir}`);
    await git.clone(githubUrl, workDir, ['--depth', '1', '--single-branch']);
  } catch (err) {
    await fs.remove(workDir).catch(() => {});
    throw new RepoAnalysisError(
      `Could not clone repository. It may be private, deleted, or unreachable. (${err.message})`,
      'CLONE_FAILED',
      422
    );
  }

  return { localPath: workDir, owner, name };
}

async function cleanupRepository(localPath) {
  if (localPath) {
    await fs.remove(localPath).catch((err) => logger.warn(`Cleanup failed for ${localPath}: ${err.message}`));
  }
}

module.exports = { parseGithubUrl, cloneRepository, cleanupRepository, RepoAnalysisError };
