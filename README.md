# PathIn

PathIn is an explainable career exploration product built as a Next.js
frontend and Flask API.

Live product: [pit26codepin.vercel.app](https://pit26codepin.vercel.app)

## Product

The `/career-tree` route works from the enabled connected profile without
requiring a resume. A resume or LinkedIn export is optional evidence that can
improve personalization.

- Optional PDF, DOCX, TXT, PNG, and JPEG evidence
- Browser-side OCR for images; Flask receives extracted text only
- Fourteen connected-profile category controls
- Deterministic, component-scored destination ranking
- Evidence-thresholded domain and portable-capability composition
- Explore and editable Build My Path modes
- Focus and pannable/zoomable Web views
- Evidence, fit, skills, path, and provenance details
- Pin, dismiss, alternatives, feedback, regenerate, save, and restore actions
- Browser snapshots plus a best-effort SQLite server copy
- Live synthetic PIT aggregates with a deterministic snapshot fallback
- Suppression of transition counts below 20 profiles

The current implementation is an explainable deterministic ranking system, not
an LLM. Every recommendation exposes its evidence and uncertainty.

See [docs/JUDGE_DEMO_GUIDE.md](docs/JUDGE_DEMO_GUIDE.md) for the architecture,
feature defense, demo script, limitations, and judge Q&A.

## Stack

- Frontend: Next.js 16, React 19, TypeScript, and Tailwind CSS
- Backend: Flask and Flask-CORS
- Package managers: npm and uv

## Requirements

- Node.js 22.x
- Python 3.10 or newer
- uv

## Frontend

```bash
nvm use
cd frontend
npm install
npm run dev
```

The frontend runs at [http://localhost:3000](http://localhost:3000).

Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` when the API is not at
`http://127.0.0.1:5000`.

## Backend

```bash
cd backend
uv sync --dev
uv run flask --app pathin_api run --debug --port 5000
```

The API runs at [http://localhost:5000](http://localhost:5000). Its health
endpoint is `GET /api/v1/health`.

If macOS AirPlay occupies port 5000, use another port and update
`NEXT_PUBLIC_API_URL`.

## Checks

```bash
cd frontend && npm test && npm run lint && npm run build
cd backend && uv run pytest
```
