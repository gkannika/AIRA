import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRepository } from '../api/client.js';

function LanguageBars({ languages }) {
  if (!languages?.length) return <div className="empty-state">No languages detected.</div>;
  return (
    <div>
      {languages.map((lang) => (
        <div className="bar-row" key={lang.name}>
          <div className="bar-label">{lang.name}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${lang.percentage}%` }} />
          </div>
          <div className="bar-pct">{lang.percentage}%</div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { id } = useParams();
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getRepository(id).then(setRepo).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="error-box">{error}</div>;
  if (!repo) return <div className="empty-state">Loading repository report…</div>;

  const { stats, summary } = repo;

  return (
    <div>
      <div className="page-heading">
        <h1>{repo.owner}/{repo.name}</h1>
        <p className="mono" style={{ color: 'var(--text-tertiary)' }}>{repo.githubUrl}</p>
      </div>

      <div className="grid-3">
        <div className="card"><div className="stat-block"><div className="stat-value">{stats?.totalFiles ?? '—'}</div><div className="stat-label">files analyzed</div></div></div>
        <div className="card"><div className="stat-block"><div className="stat-value">{stats?.totalFolders ?? '—'}</div><div className="stat-label">folders</div></div></div>
        <div className="card"><div className="stat-block"><div className="stat-value">{stats?.totalLinesOfCode?.toLocaleString?.() ?? '—'}</div><div className="stat-label">lines of code</div></div></div>
      </div>

      <div className="card">
        <div className="card-title">project summary</div>
        <p className="prose">{summary?.overview}</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">languages</div>
          <LanguageBars languages={repo.languages} />
        </div>
        <div className="card">
          <div className="card-title">frameworks &amp; technologies</div>
          <div className="tag-row">
            {(repo.frameworks || []).map((f) => <span className="tag" key={f}>{f}</span>)}
            {(repo.technologies || []).map((t) => <span className="tag" key={t}>{t}</span>)}
            {!repo.frameworks?.length && !repo.technologies?.length && <span className="empty-state">None detected.</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">architecture</div>
        <p className="prose">{summary?.architecture}</p>
        <Link to={`/architecture/${id}`}><button className="secondary" style={{ marginTop: 8 }}>View interactive diagram →</button></Link>
      </div>

      <div className="card">
        <div className="card-title">ai insights</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.8 }}>
          {(summary?.insights || []).map((insight, i) => <li key={i}>{insight}</li>)}
        </ul>
      </div>

      <div className="card">
        <div className="card-title">folder structure &amp; important files</div>
        <p className="prose">Browse the full interactive tree with per-file AI explanations in the File Explorer.</p>
        <Link to={`/explorer/${id}`}><button className="secondary">Open File Explorer →</button></Link>
      </div>

      <div className="card">
        <div className="card-title">ai-generated documentation</div>
        <div className="markdown-block">{repo.documentation || 'No documentation generated yet.'}</div>
      </div>
    </div>
  );
}
