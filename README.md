# PathIn

PathIn is organized as a small monorepo with a Next.js frontend and a Flask
API.

Live feature:
[pit26codepin.vercel.app/career-tree](https://pit26codepin.vercel.app/career-tree)

## Path[IN] prototype

The `/career-tree` page is a LinkedIn-integrated, resume-driven career
explorer. It includes:

- Blank onboarding before any recommendation or map is shown
- Secure PDF, DOCX, TXT, and LinkedIn-export parsing
- Reviewable profile fields with provenance, confidence, and category controls
- Optional interests, goals, work styles, constraints, and training context
- Flask-generated, explainable destination ranking with no frontend fallback
- Explore and Build My Path modes
- A visible career-goal layer with a selected destination and alternate goals
- A Focus view with one dominant node and two connected previews above/below
- A Web view with every active route connected on a pannable, zoomable canvas
- Clickable, touch-friendly, and keyboard-navigable career bubbles
- Up/down step traversal with left/right branch scaffolding
- Skill, course, project, role, and destination details
- Editable profile inputs with per-category controls
- Pin, dismiss, alternative, regenerate, save, reopen, and feedback actions
- SQLite persistence only for maps the user explicitly saves
- Responsive desktop and mobile layouts
- PIT-derived aggregate evidence with a 20-profile privacy threshold

The PIT source is synthetic and is labeled as such throughout the interface.
Sparse career transitions are suppressed rather than exposed as exact counts.

## Stack

- Frontend: Next.js, React, TypeScript, and Tailwind CSS
- Backend: Flask and Flask-CORS
- Package managers: npm and uv

## Requirements

- Node.js 22.15.1
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

To point browser-side generation at a Flask API, copy
`frontend/.env.example` to `frontend/.env.local` and set
`NEXT_PUBLIC_API_URL`.

## Backend

```bash
cd backend
uv sync --dev
uv run flask --app pathin_api run --debug --port 5000
```

The API runs at [http://localhost:5000](http://localhost:5000). Its health
endpoint is `GET /api/health`.

To allow additional frontend origins, copy `backend/.env.example` to
`backend/.env` and provide a comma-separated `FRONTEND_ORIGINS` value.

## Checks

```bash
cd frontend && npm test && npm run lint && npm run build
cd backend && uv run pytest
```
