# PathIn frontend

The Next.js frontend contains:

- `/`: product entry point and recommendation boundaries
- `/in/winstoniskandar`: authorized profile evidence controls
- `/career-tree`: optional uploads, generation, exploration, route editing,
  feedback, save, and restore

The connected profile is sufficient to generate. PDF, DOCX, and TXT files are
sent to Flask for in-memory parsing. PNG and JPEG OCR runs in the browser with
Tesseract.js, and only extracted TXT is uploaded.

Recommendation details expose weighted evidence, skill gaps, uncertainty, and
any supported interdisciplinary domain/capability fit returned by Flask.

## Run locally

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` when Flask is not running at
`http://127.0.0.1:5000`.

Node 22.x is required.

## Verify

```bash
npm test
npm run lint
npm run build
```
