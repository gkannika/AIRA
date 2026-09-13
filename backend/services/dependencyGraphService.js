const path = require('path');

/**
 * Builds a file/module dependency graph from per-file parse results
 * (specifically, each file's `imports` list). Resolves relative imports
 * ("./foo", "../lib/bar") to actual files in the repo; external package
 * imports (e.g. "react", "express") become shared "package" nodes so the
 * graph shows both internal structure and external dependencies.
 */
function buildDependencyGraph(parsedFiles) {
  const nodes = [];
  const nodeIds = new Set();
  const edges = [];
  const edgeKeys = new Set();

  const filePaths = parsedFiles.map((f) => f.path);
  const pathSet = new Set(filePaths);

  function addNode(id, label, type) {
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      nodes.push({ id, label, type });
    }
  }

  function addEdge(source, target) {
    const key = `${source}=>${target}`;
    if (!edgeKeys.has(key) && source !== target) {
      edgeKeys.add(key);
      edges.push({ source, target });
    }
  }

  for (const file of parsedFiles) {
    addNode(file.path, file.name, 'file');
  }

  for (const file of parsedFiles) {
    for (const imp of file.imports || []) {
      const resolved = resolveImport(file.path, imp, pathSet);
      if (resolved) {
        addEdge(file.path, resolved);
      } else if (isExternalPackage(imp)) {
        const pkgId = `pkg:${normalizePackageName(imp)}`;
        addNode(pkgId, normalizePackageName(imp), 'package');
        addEdge(file.path, pkgId);
      }
    }
  }

  return { nodes, edges };
}

function isExternalPackage(imp) {
  return typeof imp === 'string' && !imp.startsWith('.') && !imp.startsWith('/');
}

function normalizePackageName(imp) {
  // scoped packages: @scope/pkg/subpath -> @scope/pkg
  const parts = imp.split('/');
  if (imp.startsWith('@') && parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

/**
 * Attempts to resolve a relative import ("./utils/logger") from `fromPath`
 * to an actual file path present in the repo, trying common extensions.
 */
function resolveImport(fromPath, imp, pathSet) {
  if (!imp.startsWith('.')) return null;
  const fromDir = path.posix.dirname(fromPath);
  const base = path.posix.normalize(path.posix.join(fromDir, imp));
  const candidates = [
    base,
    `${base}.js`, `${base}.jsx`, `${base}.ts`, `${base}.tsx`,
    `${base}.py`, `${base}.go`, `${base}.java`,
    `${base}/index.js`, `${base}/index.ts`,
  ];
  return candidates.find((c) => pathSet.has(c)) || null;
}

module.exports = { buildDependencyGraph };
