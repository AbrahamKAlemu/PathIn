# PathIn

PathIn is organized as a small monorepo with a Next.js frontend and a Flask
API.

Live feature:
[pit26codepin.vercel.app/career-tree](https://pit26codepin.vercel.app/career-tree)

## Path[IN] prototype

The `/career-tree` page is a LinkedIn-integrated, visualization-first career
explorer. It includes:

- Explore and Build My Path modes
- A visible career-goal layer with a selected destination and alternate goals
- A Focus view with one dominant node and two connected previews above/below
- A Web view with every active route connected on a pannable, zoomable canvas
- Clickable, touch-friendly, and keyboard-navigable career bubbles
- Up/down step traversal with left/right branch scaffolding
- Skill, course, project, role, and destination details
- Editable profile inputs with per-category controls
- Pin, dismiss, alternative, regenerate, save, reopen, and feedback actions
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

To point server-side map generation at a deployed Flask API, copy
`frontend/.env.example` to `frontend/.env.local` and set `PATHIN_API_URL`.
`NEXT_PUBLIC_API_URL` is retained for future browser-side API actions.

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
cd frontend && npm run lint && npm run build
cd backend && uv run pytest
```
