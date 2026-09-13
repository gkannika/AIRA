# AI Repository Intelligence Assistant

An AI-powered web application that analyzes a public GitHub repository and produces a structured, human-readable report: project overview, folder/file explanations, technology stack, dependency graph, architecture description, an AI-generated README, and repository insights.

Built entirely with **free and open-source technology**. No paid AI APIs. No API keys required for core AI functionality (uses a locally-running Ollama model).

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, JavaScript, HTML/CSS |
| Backend | Node.js + Express.js |
| Code Parsing | Tree-sitter |
| Repository Traversal | Custom BFS/DFS traversal |
| Embeddings | `@xenova/transformers` (Sentence-Transformers, runs locally, no API key) |
| Semantic Search | Cosine similarity (custom implementation) |
| LLM | Ollama (Llama / Gemma / Mistral, run locally) |
| Diagrams | Mermaid.js |
| Database | MongoDB (Community Edition or Atlas free tier) |

## 2. Project Structure

```
ai-repo-intelligence-assistant/
├── backend/                     # Express API server
│   ├── config/db.js             # MongoDB connection (falls back to in-memory store)
│   ├── models/Repository.js     # Mongoose schema
│   ├── routes/                  # Express routes
│   ├── controllers/             # Route handlers / orchestration
│   ├── services/                # Core analysis pipeline (see below)
│   ├── utils/                   # Helpers (file filters, logger)
│   ├── data/mock/                # Sample analysis used by MOCK_MODE
│   └── server.js                # App entry point
├── frontend/                    # React + Vite dashboard
│   └── src/
│       ├── pages/                # Home, Analysis, Dashboard, Explorer, Architecture
│       ├── components/
│       └── api/client.js
├── .env.example
└── README.md
```

### Analysis pipeline (`backend/services`)

1. `cloneService.js` – validates a GitHub URL and clones the repo (shallow clone) into a temp workspace.
2. `traversalService.js` – BFS/DFS walk of the repo tree, applying `utils/fileFilters.js` to skip `.git`, `node_modules`, build output, binaries, images, lockfiles, etc.
3. `languageDetector.js` – detects languages/frameworks/config files from extensions, filenames, and manifest files (`package.json`, `requirements.txt`, `pom.xml`, ...).
4. `treeSitterParser.js` – parses source files with Tree-sitter grammars to extract functions, classes, imports.
5. `dependencyGraphService.js` – builds an import/require graph between files/modules from the parse results.
6. `embeddingService.js` – converts file/module summaries into embeddings (Sentence-Transformers via `@xenova/transformers`, fully local).
7. `similarityService.js` – cosine similarity over embeddings to retrieve only the most relevant chunks for a given question/section, so the whole repo is never dumped into the LLM.
8. `ollamaService.js` – thin client for a local Ollama server (`/api/generate`), used to turn retrieved context into human-readable text.
9. `summarizationService.js` – orchestrates 6+7+8 into: project overview, per-folder explanations, tech stack narrative, architecture description, and a generated README.
10. `mermaidService.js` – turns the dependency graph into Mermaid.js flowchart syntax.
11. `mockDataService.js` – returns a canned, realistic analysis (`data/mock/sample-repo-analysis.json`) so the full UI can be exercised with zero network access, no Ollama, and no MongoDB.

Every service is a small, independently testable module — swapping the mock pipeline for the real one is a matter of setting `MOCK_MODE=false` once Ollama/MongoDB are available locally.

## 3. Running Locally

### Prerequisites (only needed for **real** analysis, not for mock mode)
- Node.js 18+
- Git installed and on PATH
- [Ollama](https://ollama.ai) running locally, with a model pulled, e.g. `ollama pull llama3`
- MongoDB Community Edition running locally, or a MongoDB Atlas free-tier connection string

### Quick start (mock mode — no external services needed)

```bash
# 1. Backend
cd backend
cp ../.env.example .env      # MOCK_MODE=true by default
npm install
npm run dev                  # starts on http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                  # starts on http://localhost:5173
```

Open http://localhost:5173, paste any GitHub URL (it's only validated for shape in mock mode) and click **Analyze Repository** — you'll get the full dashboard, explorer, and architecture diagram populated from the bundled sample analysis.

### Real analysis mode

1. Start Ollama: `ollama serve` and `ollama pull llama3` (or `gemma`, `mistral`).
2. Start MongoDB locally (or set `MONGODB_URI` to an Atlas connection string).
3. In `backend/.env`, set:
   ```
   MOCK_MODE=false
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3
   MONGODB_URI=mongodb://127.0.0.1:27017/repo-intel
   ```
4. Restart the backend (`npm run dev`). Analyzing a repository now performs a real shallow clone, Tree-sitter parse, embedding + retrieval pass, and Ollama generation.

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/repository/analyze` | Kick off analysis for a GitHub URL, returns a repository id |
| GET | `/api/repository/:id` | Repository metadata + status |
| GET | `/api/repository/:id/tree` | Folder/file tree |
| GET | `/api/repository/:id/dependencies` | Dependency graph (nodes/edges + Mermaid syntax) |
| GET | `/api/repository/:id/summary` | Project overview, tech stack, architecture description, insights |
| GET | `/api/repository/:id/documentation` | AI-generated README/documentation |
| GET | `/api/repository/:id/file?path=...` | AI-generated explanation for a single file/folder |

## 5. Error Handling

The backend returns structured JSON errors (`{ error: { code, message } }`) for: invalid/unreachable GitHub URLs, clone failures, unsupported/huge files, Tree-sitter parse failures per-file (skipped, logged, analysis continues), and Ollama being unreachable (falls back to a template-based summary rather than failing the whole request).

## 6. Roadmap (post-MVP)

- Private repository support via GitHub OAuth
- Incremental re-analysis on webhook push events
- Multi-model comparison (Llama vs Mistral vs Gemma) for the same repo
- PDF export of the generated documentation
- Per-commit architecture diffing
