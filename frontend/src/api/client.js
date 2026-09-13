const BASE = '/api/repository';

async function handle(res) {
  if (!res.ok) {
    let body;
    try { body = await res.json(); } catch (_) { body = null; }
    const message = body?.error?.message || `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.code = body?.error?.code;
    throw error;
  }
  return res.json();
}

export async function analyzeRepository(githubUrl) {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ githubUrl }),
  });
  return handle(res);
}

export async function getRepository(id) {
  const res = await fetch(`${BASE}/${id}`);
  return handle(res);
}

export async function getTree(id) {
  const res = await fetch(`${BASE}/${id}/tree`);
  return handle(res);
}

export async function getDependencies(id) {
  const res = await fetch(`${BASE}/${id}/dependencies`);
  return handle(res);
}

export async function getSummary(id) {
  const res = await fetch(`${BASE}/${id}/summary`);
  return handle(res);
}

export async function getDocumentation(id) {
  const res = await fetch(`${BASE}/${id}/documentation`);
  return handle(res);
}

export async function getFileExplanation(id, path) {
  const res = await fetch(`${BASE}/${id}/file?path=${encodeURIComponent(path)}`);
  return handle(res);
}
