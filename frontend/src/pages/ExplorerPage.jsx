import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTree, getFileExplanation } from '../api/client.js';

function TreeNode({ node, onSelect, selectedPath, depth = 0 }) {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === 'folder';

  return (
    <li>
      <div
        className={`tree-row ${selectedPath === node.path ? 'selected' : ''}`}
        onClick={() => (isFolder ? setOpen((o) => !o) : onSelect(node))}
      >
        <span className="icon">{isFolder ? (open ? '▾' : '▸') : '·'}</span>
        <span>{node.name}</span>
      </div>
      {isFolder && open && node.children?.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.path || child.name} node={child} onSelect={onSelect} selectedPath={selectedPath} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ExplorerPage() {
  const { id } = useParams();
  const [tree, setTree] = useState(null);
  const [selected, setSelected] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTree(id).then((data) => setTree(data.tree)).catch((err) => setError(err.message));
  }, [id]);

  async function handleSelect(node) {
    setSelected(node);
    setExplanation(null);
    setLoadingExplanation(true);
    try {
      const data = await getFileExplanation(id, node.path);
      setExplanation(data.explanation);
    } catch (err) {
      setExplanation(`Could not load an explanation for this file: ${err.message}`);
    } finally {
      setLoadingExplanation(false);
    }
  }

  return (
    <div>
      <div className="page-heading">
        <h1>File Explorer</h1>
        <p>Select any file to see an AI-generated explanation of what it does.</p>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card file-tree">
          <div className="card-title">repository tree</div>
          {tree ? (
            <ul>
              <TreeNode node={tree} onSelect={handleSelect} selectedPath={selected?.path} />
            </ul>
          ) : (
            <div className="empty-state">Loading tree…</div>
          )}
        </div>

        <div className="card">
          <div className="card-title">{selected ? selected.path : 'file explanation'}</div>
          {!selected && <div className="empty-state">Select a file on the left to see its explanation.</div>}
          {selected && loadingExplanation && <div className="empty-state">Generating explanation…</div>}
          {selected && !loadingExplanation && <p className="prose">{explanation}</p>}
        </div>
      </div>
    </div>
  );
}
