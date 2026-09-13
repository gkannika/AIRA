/**
 * Rules for deciding which files/folders are worth analyzing.
 * Keeps the pipeline fast and keeps noise out of the LLM context.
 */

const IGNORED_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'out', '.next', '.nuxt',
  '.venv', 'venv', '__pycache__', '.pytest_cache', 'target', 'bin', 'obj',
  '.idea', '.vscode', 'coverage', '.turbo', '.cache', 'vendor',
]);

const IGNORED_FILE_EXTENSIONS = new Set([
  // binaries / media
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
  '.mp4', '.mov', '.avi', '.mp3', '.wav', '.ogg',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.woff', '.woff2', '.ttf', '.eot',
  '.exe', '.dll', '.so', '.dylib', '.class', '.jar',
  '.pdf',
  // lockfiles - useful for dependency detection, but not for parsing
  '.lock',
]);

const IGNORED_FILENAMES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Gemfile.lock',
  '.DS_Store', 'Thumbs.db',
]);

// Manifest / config files worth reading in full for tech-stack detection,
// even though they aren't "source code" to Tree-sitter.
const MANIFEST_FILES = new Set([
  'package.json', 'requirements.txt', 'Pipfile', 'pyproject.toml',
  'pom.xml', 'build.gradle', 'go.mod', 'Cargo.toml', 'composer.json',
  'Gemfile', 'Dockerfile', 'docker-compose.yml', '.env.example',
  'tsconfig.json', 'vite.config.js', 'next.config.js',
]);

const SOURCE_EXTENSIONS_TO_LANGUAGE = {
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cc': 'cpp', '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.kt': 'kotlin',
  '.swift': 'swift',
};

function shouldIgnoreDir(dirName) {
  return IGNORED_DIRS.has(dirName) || dirName.startsWith('.') && dirName !== '.github';
}

function shouldIgnoreFile(fileName) {
  if (IGNORED_FILENAMES.has(fileName)) return true;
  const ext = getExtension(fileName);
  return IGNORED_FILE_EXTENSIONS.has(ext);
}

function getExtension(fileName) {
  const idx = fileName.lastIndexOf('.');
  return idx === -1 ? '' : fileName.slice(idx).toLowerCase();
}

function isManifestFile(fileName) {
  return MANIFEST_FILES.has(fileName);
}

function detectLanguage(fileName) {
  return SOURCE_EXTENSIONS_TO_LANGUAGE[getExtension(fileName)] || null;
}

module.exports = {
  shouldIgnoreDir,
  shouldIgnoreFile,
  isManifestFile,
  detectLanguage,
  getExtension,
  MANIFEST_FILES,
  SOURCE_EXTENSIONS_TO_LANGUAGE,
};
