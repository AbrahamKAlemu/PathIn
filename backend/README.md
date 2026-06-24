# PathIn API

Flask API for PathIn. The service validates and parses PDF, DOCX, and TXT
profiles, merges reviewed profile evidence, ranks personalized destinations,
generates dynamic routes, validates saved route edits, suppresses sparse
cohort evidence, and accepts recommendation feedback. Image OCR is performed
in the browser before extracted TXT reaches this service.

```bash
uv sync --dev
uv run flask --app pathin_api run --debug --port 5000
```

## Versioned endpoints

- `GET /api/v1/health`
- `POST /api/v1/resumes/parse`
- `POST /api/v1/profiles/normalize`
- `GET/PATCH /api/v1/profiles/current`
- `POST /api/v1/maps/explore`
- `POST /api/v1/maps/build`
- `GET /api/v1/maps/{map_id}`
- `PATCH /api/v1/maps/{map_id}`
- `POST /api/v1/maps/{map_id}/regenerate`
- `POST /api/v1/maps/{map_id}/feedback`
- `GET /api/v1/roles/{role_id}`

The service fetches the public synthetic PIT dataset, caches the aggregate
catalog for one hour, and falls back to a deterministic aggregate snapshot
when the source is unavailable. It never returns raw member histories, and
exact transition counts below 20 profiles are suppressed.

Uploads are validated by extension, MIME type, and file signature, processed
in memory, and not permanently stored. Unsaved maps are instance memory only.
Explicit saves write SQLite and return a map that the frontend also stores as
a browser snapshot.

On Vercel, the configured SQLite path is under `/tmp`, so browser storage is
the durable user-facing fallback; server persistence is not cross-instance or
cross-device.

```bash
uv run pytest
```
