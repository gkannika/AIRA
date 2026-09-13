const fs = require('fs-extra');
const path = require('path');
const { shouldIgnoreDir, shouldIgnoreFile } = require('../utils/fileFilters');

/**
 * BFS traversal of the repository root.
 * Produces:
 *  - a flat list of files (with relative path, size, extension)
 *  - a nested tree structure for the File/Folder Explorer UI
 * Ignored directories/files (per utils/fileFilters) are skipped entirely,
 * so noise like node_modules or build output never reaches later stages.
 */
async function traverseRepository(rootPath, { maxFiles = 2000 } = {}) {
  const files = [];
  let totalFolders = 0;

  const rootNode = { name: path.basename(rootPath), type: 'folder', path: '', children: [] };

  // queue holds { fsPath, relPath, node } - BFS via array + shift
  const queue = [{ fsPath: rootPath, relPath: '', node: rootNode }];

  while (queue.length > 0) {
    const { fsPath, relPath, node } = queue.shift();
    let entries;
    try {
      entries = await fs.readdir(fsPath, { withFileTypes: true });
    } catch (err) {
      continue; // unreadable directory (permissions, symlink loop, etc.) - skip
    }

    // Sort: folders first, then files, alphabetically - nicer UI tree
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const entryRel = relPath ? `${relPath}/${entry.name}` : entry.name;
      const entryFs = path.join(fsPath, entry.name);

      if (entry.isDirectory()) {
        if (shouldIgnoreDir(entry.name)) continue;
        totalFolders += 1;
        const childNode = { name: entry.name, type: 'folder', path: entryRel, children: [] };
        node.children.push(childNode);
        queue.push({ fsPath: entryFs, relPath: entryRel, node: childNode });
      } else {
        if (shouldIgnoreFile(entry.name)) continue;
        if (files.length >= maxFiles) continue;

        let size = 0;
        try {
          size = (await fs.stat(entryFs)).size;
        } catch (_) { /* ignore */ }

        const fileInfo = { name: entry.name, path: entryRel, fsPath: entryFs, size };
        files.push(fileInfo);
        node.children.push({ name: entry.name, type: 'file', path: entryRel, size });
      }
    }
  }

  return { tree: rootNode, files, totalFolders };
}

module.exports = { traverseRepository };
