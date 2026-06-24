# PathIn API

Flask API for Path[IN]. The service securely parses PDF, DOCX, and TXT
profiles, merges reviewed profile evidence, ranks personalized destinations,
generates dynamic routes, persists explicitly saved maps, suppresses sparse
cohort evidence, and accepts recommendation feedback.

```bash
uv sync --dev
uv run flask --app pathin_api run --debug --port 5000
```

## Versioned endpoints

- `GET /api/v1/health`
- `POST /api/v1/resumes/parse`
- `POST /api/v1/profiles/normalize`
- `POST /api/v1/maps/explore`
- `POST /api/v1/maps/build`
- `GET /api/v1/maps/{map_id}`
- `PATCH /api/v1/maps/{map_id}`
- `POST /api/v1/maps/{map_id}/regenerate`
- `POST /api/v1/maps/{map_id}/feedback`
- `GET /api/v1/roles/{role_id}`

The prototype fetches the public synthetic PIT dataset and falls back to a
deterministic aggregate snapshot when the source is unavailable. It never
returns raw member histories, and exact transition counts below 20 profiles
are suppressed.

Uploads are validated by extension, MIME type, and file signature, processed
in memory, and not permanently stored. Generated maps contain reviewed profile
facts and are persisted to SQLite only when the user explicitly chooses Save.

```bash
uv run pytest
```
