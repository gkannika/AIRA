import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import mermaid from 'mermaid';
import { getDependencies, getRepository } from '../api/client.js';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    background: '#101215',
    primaryColor: '#171a1e',
    primaryTextColor: '#eef0f2',
    primaryBorderColor: '#3a4148',
    lineColor: '#4fd1c5',
    secondaryColor: '#1a1e22',
    tertiaryColor: '#101215',
    fontFamily: 'JetBrains Mono, monospace',
  },
});

export default function ArchitecturePage() {
  const { id } = useParams();
  const [graph, setGraph] = useState(null);
  const [architectureText, setArchitectureText] = useState('');
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    Promise.all([getDependencies(id), getRepository(id)])
      .then(([depData, repoData]) => {
        setGraph(depData.dependencyGraph);
        setArchitectureText(repoData.summary?.architecture || '');
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    async function render() {
      if (!graph?.mermaid || !containerRef.current) return;
      try {
        const { svg } = await mermaid.render(`arch-diagram-${id}`, graph.mermaid);
        containerRef.current.innerHTML = svg;
      } catch (err) {
        containerRef.current.innerHTML = `<div class="empty-state">Could not render diagram: ${err.message}</div>`;
      }
    }
    render();
  }, [graph, id]);

  return (
    <div>
      <div className="page-heading">
        <h1>Architecture</h1>
        <p>An interactive dependency diagram showing how files and packages relate to each other.</p>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <div className="card-title">module relationships</div>
        {!graph && !error && <div className="empty-state">Loading diagram…</div>}
        {graph && (!graph.nodes || graph.nodes.length === 0) && (
          <div className="empty-state">No dependency relationships were detected in this repository.</div>
        )}
        <div ref={containerRef} style={{ overflowX: 'auto' }} />
      </div>

      {architectureText && (
        <div className="card">
          <div className="card-title">what this means</div>
          <p className="prose">{architectureText}</p>
        </div>
      )}

      <div className="tag-row" style={{ marginTop: 4 }}>
        <span className="tag">◆ file node</span>
        <span className="tag">◇ external package</span>
      </div>
    </div>
  );
}
