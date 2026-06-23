# PathIn API

Flask API for Path[IN]. The service normalizes authorized profile fields,
builds Explore and Build My Path responses, stores prototype maps in memory,
suppresses sparse cohort evidence, and accepts recommendation feedback.

```bash
uv sync --dev
uv run flask --app pathin_api run --debug --port 5000
```

## Versioned endpoints

- `GET /api/v1/health`
- `POST /api/v1/profiles/normalize`
- `GET /api/v1/maps/demo`
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
