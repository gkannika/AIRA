const fs = require('fs-extra');
const { detectLanguage, isManifestFile } = require('../utils/fileFilters');

// Manifest file -> framework/technology hints, keyed off dependency names.
const DEPENDENCY_HINTS = {
  react: 'React', next: 'Next.js', vue: 'Vue.js', nuxt: 'Nuxt.js',
  express: 'Express.js', fastify: 'Fastify', koa: 'Koa',
  mongoose: 'MongoDB (Mongoose)', pg: 'PostgreSQL', mysql: 'MySQL', sequelize: 'Sequelize',
  tailwindcss: 'Tailwind CSS', vite: 'Vite', webpack: 'Webpack',
  typescript: 'TypeScript', jest: 'Jest', mocha: 'Mocha',
  django: 'Django', flask: 'Flask', fastapi: 'FastAPI',
  numpy: 'NumPy', pandas: 'Pandas', torch: 'PyTorch', tensorflow: 'TensorFlow',
  'spring-boot': 'Spring Boot', spring: 'Spring',
};

/**
 * Scans the file list + reads manifest files to determine:
 *  - languages used and their file-count percentages
 *  - frameworks/technologies inferred from dependency manifests
 *  - which config files were found
 */
async function detectTechnologies(files) {
  const languageCounts = {};
  const configFiles = [];
  const technologySet = new Set();
  const frameworkSet = new Set();

  for (const file of files) {
    const lang = detectLanguage(file.name);
    if (lang) {
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }
    if (isManifestFile(file.name)) {
      configFiles.push(file.path);
      await inspectManifest(file, technologySet, frameworkSet);
    }
  }

  const totalLangFiles = Object.values(languageCounts).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(languageCounts)
    .map(([name, fileCount]) => ({
      name,
      fileCount,
      percentage: Math.round((fileCount / totalLangFiles) * 1000) / 10,
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  return {
    languages,
    frameworks: Array.from(frameworkSet),
    technologies: Array.from(technologySet),
    configFiles,
  };
}

async function inspectManifest(file, technologySet, frameworkSet) {
  try {
    if (file.name === 'package.json') {
      const content = await fs.readJson(file.fsPath).catch(() => null);
      if (!content) return;
      const deps = { ...(content.dependencies || {}), ...(content.devDependencies || {}) };
      technologySet.add('Node.js');
      for (const depName of Object.keys(deps)) {
        const hint = DEPENDENCY_HINTS[depName.toLowerCase()];
        if (hint) frameworkSet.add(hint);
      }
    } else if (file.name === 'requirements.txt' || file.name === 'Pipfile' || file.name === 'pyproject.toml') {
      technologySet.add('Python');
      const content = await fs.readFile(file.fsPath, 'utf-8').catch(() => '');
      for (const [dep, hint] of Object.entries(DEPENDENCY_HINTS)) {
        if (content.toLowerCase().includes(dep)) frameworkSet.add(hint);
      }
    } else if (file.name === 'pom.xml' || file.name === 'build.gradle') {
      technologySet.add('Java');
      const content = await fs.readFile(file.fsPath, 'utf-8').catch(() => '');
      if (content.toLowerCase().includes('spring')) frameworkSet.add('Spring / Spring Boot');
    } else if (file.name === 'go.mod') {
      technologySet.add('Go');
    } else if (file.name === 'Cargo.toml') {
      technologySet.add('Rust');
    } else if (file.name === 'composer.json') {
      technologySet.add('PHP');
    } else if (file.name === 'Gemfile') {
      technologySet.add('Ruby');
    } else if (file.name === 'Dockerfile' || file.name === 'docker-compose.yml') {
      technologySet.add('Docker');
    }
  } catch (_) {
    // Non-fatal: a single unreadable/malformed manifest shouldn't break detection.
  }
}

module.exports = { detectTechnologies };
