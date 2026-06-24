# Path[IN] frontend

The `/career-tree` route starts with resume/profile onboarding. It does not
render a career map until the Flask recommendation request succeeds. The
returned map is displayed in focused vertical and pannable web views.

## Run locally

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` when Flask is not running at
`http://127.0.0.1:5000`.

## Verify

```bash
npm test
npm run lint
npm run build
```
