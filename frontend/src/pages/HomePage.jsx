import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeRepository } from '../api/client.js';

const EXAMPLES = [
  'https://github.com/octocat/task-flow',
  'https://github.com/facebook/react',
  'https://github.com/expressjs/express',
];

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { id } = await analyzeRepository(url.trim());
      navigate(`/analysis/${id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-heading">
        <h1>AI Repository Intelligence Assistant</h1>
        <p>
          Point it at a public GitHub repository. It clones, traverses, parses, and
          reads the code, then generates a plain-language report of what the project
          is, how it's built, and how its pieces connect — without ever uploading the
          whole repo to an LLM.
        </p>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="card-title">repository url</div>
        <input
          className="url-input"
          type="text"
          placeholder="https://github.com/owner/repository"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Starting analysis…' : 'Analyze Repository'}
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Public repositories only, for now.
          </span>
        </div>
        {error && <div className="error-box" style={{ marginTop: 16 }}>{error}</div>}
      </form>

      <div className="card">
        <div className="card-title">try one of these</div>
        <div className="tag-row">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="tag" style={{ cursor: 'pointer' }} onClick={() => setUrl(ex)}>
              {ex.replace('https://github.com/', '')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
