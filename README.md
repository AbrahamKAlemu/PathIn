# PathIn

PathIn is organized as a small monorepo with a Next.js frontend and a Flask
API.

Live site: [pit26codepin.vercel.app](https://pit26codepin.vercel.app)

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

To point it at a deployed API, copy `frontend/.env.example` to
`frontend/.env.local` and change `NEXT_PUBLIC_API_URL`.

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
