import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRepository } from '../api/client.js';

const STEPS = [
  { key: 'cloning', label: 'Cloning repository' },
  { key: 'scanning', label: 'Scanning files (BFS traversal)' },
  { key: 'parsing', label: 'Parsing code with Tree-sitter' },
  { key: 'analyzing', label: 'Running AI analysis (embeddings + Ollama)' },
  { key: 'completed', label: 'Finalizing report' },
];

function stepState(stepKey, currentStatus) {
  const order = ['queued', ...STEPS.map((s) => s.key)];
  const currentIdx = order.indexOf(currentStatus);
  const stepIdx = order.indexOf(stepKey);
  if (currentStatus === 'failed') return stepIdx < currentIdx ? 'done' : 'pending';
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getRepository(id);
        if (cancelled) return;
        setRepo(data);
        if (data.status === 'completed') {
          clearInterval(pollRef.current);
          setTimeout(() => navigate(`/dashboard/${id}`), 500);
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          clearInterval(pollRef.current);
        }
      }
    }

    poll();
    pollRef.current = setInterval(poll, 1200);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [id, navigate]);

  return (
    <div>
      <div className="page-heading">
        <h1>Analyzing repository</h1>
        <p className="mono" style={{ color: 'var(--text-tertiary)' }}>{repo?.githubUrl || '…'}</p>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!error && repo?.status === 'failed' && (
        <div className="error-box">
          {repo.error?.message || 'Analysis failed for an unknown reason.'}
        </div>
      )}

      {!error && repo && (
        <div className="card">
          <div className="card-title">pipeline status</div>
          <div className="progress-list">
            {STEPS.map((step) => {
              const state = stepState(step.key, repo.status);
              return (
                <div key={step.key} className={`progress-item ${state}`}>
                  <div className="marker" />
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
          {repo.statusMessage && (
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-tertiary)' }}>{repo.statusMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
