# PathIn Judge Demo and Technical Defense Guide

Last verified: June 24, 2026

## 1. The shortest correct pitch

PathIn turns user-controlled professional evidence into multiple inspectable
career directions and editable routes. It does not predict that someone will
get a job. It ranks plausible roles, shows why each role was selected, exposes
skill gaps and uncertainty, and lets the user change or reject the route.

The connected profile is enough to start. A resume is optional. If supplied,
it adds evidence instead of becoming a gate.

## 2. What PathIn is and is not

PathIn is:

- An explainable decision and ranking system
- An evidence normalization pipeline
- A career-role taxonomy and route generator
- A privacy-screened use of the synthetic PIT dataset
- An interactive editor for comparing and customizing routes

PathIn is not:

- A hiring prediction
- A guarantee that a transition will work
- A live LinkedIn integration or scraper
- A live jobs marketplace
- A real LinkedIn Learning enrollment system
- An LLM or free-form text generator
- A production authentication or cross-device persistence system

Use the phrase "user-authorized LinkedIn-style profile" in the demo. The
current signed-in profile is a supplied fixture. No LinkedIn credentials,
cookies, or private API access are used.

## 3. System architecture

```text
Browser
  |
  | Next.js pages and React state
  v
PathIn frontend
  |
  | JSON and multipart HTTP requests
  v
Flask API
  |
  +--> Profile normalizer
  +--> Resume parser
  +--> 26-role occupational taxonomy
  +--> PIT aggregate repository
  +--> Recommendation and route engine
  +--> In-memory working maps
  +--> SQLite explicit saves

Browser localStorage
  +--> Saved map snapshot
  +--> Selected mode, route, node, zoom, pins, and dismissals
```

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS plus scoped CSS modules
- Tesseract.js for browser-side image OCR

### Backend

- Flask
- Flask-CORS
- pypdf for PDF extraction
- python-docx for DOCX extraction
- SQLite for the current-profile fixture and explicitly saved maps

### Main routes

| Route | Purpose |
| --- | --- |
| `/` | Product entry point, boundaries, and quick product guarantees |
| `/in/winstoniskandar` | Review and control the connected profile evidence |
| `/career-tree` | Generate, inspect, edit, save, restore, and regenerate maps |

## 4. End-to-end data flow

### Profile-only generation

1. The browser requests `GET /api/v1/profiles/current`.
2. The API returns the user-supplied profile fixture and a `pathinEvidence`
   allowlist.
3. The user may disable any of 14 categories.
4. The browser sends only enabled evidence to
   `POST /api/v1/maps/explore`.
5. Flask normalizes evidence, retrieves PIT aggregates, scores all 26 roles,
   chooses credible destinations, and generates route nodes and edges.
6. React renders the returned JSON. There is no hardcoded production map
   fallback in the browser.

### Resume-assisted generation

1. PDF, DOCX, or TXT is validated in both browser and Flask.
2. Flask extracts fields and labels every field with source, confidence,
   explicit/inferred status, and enabled state.
3. The browser merges resume evidence with enabled connected-profile evidence.
4. Duplicate evidence is normalized and corroboration is retained.
5. Generation follows the same scoring and route pipeline.

### PNG or JPEG generation

1. The browser validates the image type and 5 MB size limit.
2. Tesseract.js performs OCR locally.
3. The browser creates a temporary TXT file from the extracted text.
4. Only that TXT is sent to Flask.
5. The raw image is never sent to the API.

## 5. Evidence model

The profile supports 14 independently controlled categories:

1. Education
2. Coursework
3. Roles and titles
4. Responsibilities
5. Dates
6. Projects
7. Skills
8. Certifications
9. Industries
10. Achievements
11. Interests
12. Locations
13. Career goals
14. Work style

Every evidence item can include:

- Original value
- Normalized value
- Source: resume, LinkedIn-style profile, manual correction, or inference
- Confidence
- Whether it was explicit or inferred
- Whether the user enabled it
- Corroborating sources

Source priority is deliberate:

1. User correction
2. Manual input
3. Resume
4. LinkedIn-style profile
5. Inference

Inferred skills remain labeled and receive less weight than explicit evidence.

The normalizer also derives a profile fingerprint:

- Domain themes, such as Healthcare or Legal and Policy
- Portable capability themes, such as Computational Building or Research and
  Synthesis
- Problem themes
- Evidence quality and completeness

Every derived theme retains the supplied evidence that triggered it.

## 6. Ranking algorithm

PathIn scores every role in a maintained 26-role taxonomy. It uses deterministic
lexical and semantic concept matching, role adjacency, skill gaps, seniority,
preferences, and privacy-safe PIT history.

Current generation metadata is `pathin-occupations-1.2`,
`pathin-ranking-2.5`, `evidence-grounded-personalization-2.5`, and
`evidence-grounded-career-paths-2.5`.

### Score weights

| Component | Weight |
| --- | ---: |
| Skill overlap | 25 |
| Experience and responsibility adjacency | 20 |
| Interests and goals | 15 |
| Project evidence | 10 |
| Education relevance | 10 |
| Preferences and constraints | 10 |
| Transition effort | 5 |
| Career-history evidence | 5 |

Each component is scored from 0 to 100.

```text
component contribution = component score * component weight / 100
overall score = sum of all component contributions
```

The final score is capped from 0 to 100.

### Why these weights

- Skills and demonstrated responsibilities dominate because they are the
  strongest evidence of current capability.
- Goals matter, but cannot erase missing evidence.
- Projects and education support a direction without overpowering work proof.
- Preferences are meaningful only when supplied.
- Historical transitions are only 5 percent so popularity does not dictate the
  future.

### Neutral handling of omitted preferences

If the user supplies no industry, work-style, or location preference, that
component receives a neutral score instead of inventing a preference or
penalizing the user.

### Exact goals

If a supplied goal exactly matches a taxonomy alias, its interests-and-goals
component becomes 100 and the North Star is marked as user selected. The role
still exposes gaps, seniority, and uncertainty.

### Interdisciplinary composition

PathIn can combine a demonstrated capability with a supplied domain instead of
requiring the profile to contain an exact job title. For example, it can
connect software and research evidence with healthcare.

An interdisciplinary fit requires:

- At least one portable capability shared by the profile and role
- An evidence-fit component of at least 20
- At least two role-skill anchors, unless the role is explicit or adjacent
- A domain strength of at least 0.6
- At least two supporting domain facts, unless an industry, interest, or goal
  states the direction explicitly

The fit may strengthen the interests-and-goals component, but it does not erase
skill gaps or seniority penalties. When the primary result comes from an
explicit goal, an adjacent role is preferred as the comparison. Otherwise, a
supported interdisciplinary option can outrank a weakly related adjacent role.

### Seniority protection

Targets far above the explicit current level receive a seniority penalty.
PathIn does not casually recommend an executive or management jump without
leadership evidence.

### Feedback modifiers

Regeneration can incorporate:

- More like this
- Something different
- Not for me
- Pinned destinations
- Avoided step labels

Feedback changes later ranking; the original score components remain
inspectable.

### Diversity rule

Explore must return at least two credible career options. It prefers different
role families, but it does not force an irrelevant family merely for visual
variety. If exclusions leave fewer than two eligible options, the API returns
a clear `INSUFFICIENT_DESTINATION_VARIETY` error.

## 7. Score, confidence, stage, and difficulty are different

Do not use these words interchangeably.

### Overall score

The weighted evidence fit for one destination.

### Confidence

Confidence adjusts the score for profile completeness, an explicit current-role
anchor, and market evidence.

```text
adjusted confidence score =
  overall score * (0.65 + completeness * 0.35)
  + 8 when the role directly matches an explicit current role
  - 5 when no market aggregate is available
```

- Strong: adjusted score at least 75
- Moderate: at least 58
- Limited: at least 42
- Exploratory: below 42

An incomplete profile can have a promising score but lower confidence.

### Match stage

- Qualified now: skill score at least 72, responsibility score at least 60,
  and no unsupported seniority jump
- Realistic next move: skill or responsibility score at least 38
- Longer-term path: below those thresholds

### Transition difficulty

Difficulty depends on skill gaps and seniority distance:

- Lower
- Moderate
- High

## 8. PIT data and privacy

PathIn fetches:

- `user_data.json`
- `jobs_data.json`
- `course_data.json`

from `https://pit.najera.cc`.

The PIT dataset is synthetic. It is not real LinkedIn member data.

The API:

- Maps job titles into the PathIn taxonomy
- Aggregates posting counts, salary ranges, industries, levels, and locations
- Derives transition counts from synthetic job histories
- Caches the aggregate catalog for one hour
- Falls back to a deterministic snapshot if PIT is unavailable

The fallback snapshot represents:

- 2,000 synthetic members
- 1,000 synthetic jobs
- 600 synthetic courses

Exact historical transition counts are shown only when at least 20 synthetic
profiles support the transition. Counts below 20 are marked suppressed.

Raw member histories are never returned to the frontend.

## 9. How routes are generated

### Explore

The browser requests four destinations. The engine can return fewer if only
fewer are defensible, but never fewer than two.

Each destination includes:

- Canonical role
- Personalized title
- Score components
- Confidence
- Match stage
- Difficulty
- Matching evidence
- Skill gaps
- Constraints
- Historical-evidence status
- Uncertainty

### Build My Path

Build routes are generated in the same map response, so switching modes does
not make another API call.

Each destination has at least two strategies:

- Proof-first: build a missing skill and produce reviewable evidence
- Bridge-first: gain adjacent responsibilities or use an adjacent role before
  the destination

This is why "Build My Path" feels instant while still using Flask-generated
routes.

### Node types

- Current standing
- Skill
- Course or guided learning plan
- Experience or project proof
- Entry role
- Bridge role
- Destination

### Edges

Edges state why one step leads to another and label the evidence type:

- Observed transition
- Recommended transition
- Skill bridge
- Helpful preparation
- Alternative

## 10. How generated text stays grounded

PathIn does not ask an LLM to improvise sentences.

Text is assembled from:

- Enabled profile evidence
- Maintained role-taxonomy facts
- Computed skill gaps
- PIT aggregate metadata
- Deterministic explanation templates

Each node includes a source record. Recommendation details show the evidence
items and uncertainty used for that result.

Displayed strengths use the profile's supplied wording. Candidate-side
taxonomy labels are not relabeled as user evidence. A match requires an exact
phrase, a shared maintained semantic concept, or at least two meaningful
shared terms; one generic word such as "analysis" is not enough.

If role-specific evidence is sparse, the copy says that evidence is limited.
It does not describe an invented strength.

Project steps reuse a supplied project only when it matches target-role skills,
maintained role-project patterns, or the target domain. Otherwise the engine
uses a neutral role-specific artifact rather than repurposing an unrelated
project or inventing a personal one. A generic word such as "research" cannot
by itself turn an HCI paper into finance or investment evidence.

LinkedIn Learning cards are live search URLs built from visible skill gaps.
PathIn does not claim that a specific course is current, enrolled, completed,
or endorsed.

## 11. Every visible feature and its purpose

### Home

| Feature | Purpose |
| --- | --- |
| Product explanation | Gives a judge the value proposition before the demo |
| Explore career paths | Opens the core workflow |
| Review profile evidence | Opens user-controlled data settings |
| Recommendation boundaries | Prevents overclaiming |
| Quick checks | Makes privacy, optional resume, scoring, and save behavior explicit |

### Header

Home and Me are real links. The search-shaped control opens the career
explorer.

My Network, Jobs, Messaging, Notifications, For Business, and Learning are
host-context buttons. Each opens a boundary panel explaining why that surface
is not implemented and what PathIn does not access. They do not pretend to be
working LinkedIn products.

### Profile page

| Feature | Purpose |
| --- | --- |
| Contact info | Shows the supplied public profile facts and no-scraping boundary |
| Manage PathIn data | Enables or disables the 14 evidence categories |
| Experience/Education/Skills/Honors dialogs | Shows exactly what evidence exists |
| Skills count | Shows two supplied names; it does not invent the remaining reported names |
| Honors count | Shows two supplied records; it does not invent the remaining reported awards |
| Generate career paths | Moves directly into the core workflow |

Analytics, endorsements, viewer suggestions, activity, demographics, and
private messages are excluded from ranking.

### Onboarding

| Feature | Purpose |
| --- | --- |
| Connected-profile toggle | Lets the user include or exclude that source |
| Optional resume | Adds evidence but is not required |
| Optional LinkedIn export | Supplements the connected fixture without scraping a URL |
| Remove/Replace | Gives control over uploaded evidence |
| Generate | Enabled only when at least one usable evidence source exists |
| Open saved path | Restores a browser snapshot without generating again |

### Map header

| Feature | Purpose |
| --- | --- |
| Saved paths | Opens the one explicit saved snapshot |
| Regenerate | Requests a new ranked set while preserving applicable feedback |
| Save path | Saves pins, dismissals, edited nodes, custom steps, and route order |
| Start over | Clears the working map but preserves an explicit save |

### Explore and Build My Path

- Explore compares destinations.
- Build My Path compares strategies toward one destination.
- Mode switching is local because all build routes are already in the map.
- Edits remain available when switching modes.

### Focus and Web

- Focus reduces cognitive load to one dominant node with nearby context.
- Up/down changes depth within one path.
- Left/right changes career or route at a comparable depth.
- Web shows all active paths, supports pan, zoom, centering, and direct node
  selection.
- Keyboard arrow navigation mirrors the visible controls.
- Legend explains the node color vocabulary, arrow direction, and branch
  meaning. It directs users to the Path and Evidence tabs for rationale and
  confidence instead of implying that line styles encode certainty.

### Detail drawer

| Tab | Question answered |
| --- | --- |
| Overview | What is this step and what proves completion? |
| Fit | Why might it fit, and what is uncertain? |
| Skills | What exists and what must be built? |
| Path | What comes before and after? |
| Evidence | Which profile facts and sources support it? |

The current-standing node cannot be pinned or dismissed because every route
requires a factual starting point.

### Recommendation actions

| Action | Purpose |
| --- | --- |
| Pin step | Preserve the step during regeneration |
| Show alternatives | Select another generated step or route |
| Not for me | Regenerate without that role or step |
| Give feedback | Record helpfulness, correctness, or safety feedback with map versions |
| Build toward this | Open editable routes for a selected destination |

### Route editor

| Action | Purpose |
| --- | --- |
| Move earlier/later | Reorder intermediate steps without moving start or goal |
| Drag | Pointer equivalent of the move controls |
| Add recommended node | Reuse another generated route step or close a visible gap |
| Add custom step | Capture a user-specific action the taxonomy cannot know |
| Edit | Rewrite a title and proof statement |
| Remove | Remove an intermediate step |
| Reset | Restore the Flask-generated version |

Saving materializes edits into nodes and paths. Flask validates that:

- Generated nodes cannot be removed from the map record
- Start remains `current`
- Goal remains the final node
- Route IDs cannot be added or deleted
- Node IDs are unique
- Custom nodes use bounded, supported schemas

## 12. Persistence truth

### Unsaved maps

Held in Flask instance memory. They are not intended as durable records.

### Explicitly saved maps

`PATCH /api/v1/maps/{id}` writes a SQLite server copy and returns the validated
map.

The browser also stores:

- Full saved map snapshot
- Saved timestamp
- Mode
- Focus/Web view
- Selected destination, path, and node
- Open detail tab
- Pins and dismissals
- Zoom

### Vercel limitation

The deployed Flask app points SQLite to `/tmp`. In a serverless environment,
that storage is instance-local and ephemeral.

Therefore:

- Browser localStorage is the reliable same-browser restore mechanism
- The server copy is best effort
- Saves are not cross-device
- Saves are not tied to a real authenticated account

Do not claim production persistence. A production version needs an authenticated
durable database such as Postgres.

### Feedback

Feedback is held in backend instance memory and includes map generation
versions. It proves the feedback contract, but it is not durable analytics in
the current deployment.

## 13. Security and privacy controls

- CORS is allowlisted for local development and the deployed frontend
- Uploads are limited to 5 MB
- Flask validates extension, MIME type, and file signature
- PDF, DOCX, and TXT are processed in memory
- Raw upload files are not permanently stored
- Image OCR runs in the browser
- Only extracted TXT from images reaches Flask
- SQL operations use parameters
- React escapes rendered profile and resume text
- No LinkedIn credentials are requested
- No LinkedIn page is scraped
- No raw PIT member history reaches the browser
- Transition counts below 20 are suppressed
- Only enabled profile categories enter ranking

## 14. What is hardcoded

Be direct.

Hardcoded or maintained:

- The current Winston Iskandar profile fixture
- The 26-role occupational taxonomy
- Role aliases and semantic concept dictionaries
- The deterministic PIT fallback snapshot
- Product copy, icons, and layout
- Ranking weights and confidence thresholds

Computed at runtime:

- Enabled evidence set
- Parsed resume fields
- Corroboration and conflicts
- Destination ranking and scores
- Confidence, difficulty, and match stage
- Domain and portable-capability fingerprint
- Interdisciplinary role fit
- Skill gaps
- Route nodes and order
- Personalized explanations
- LinkedIn Learning search terms
- Pins, dismissals, custom steps, and saved map

The taxonomy is intentional maintained product knowledge, not a hardcoded
answer for one user. The same engine was tested across all 26 targets and
contrasting profiles.

## 15. API purpose

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/health` | Version and privacy-threshold diagnostics |
| `POST /api/v1/resumes/parse` | Validate and parse PDF, DOCX, or TXT |
| `POST /api/v1/profiles/normalize` | Standalone normalization contract |
| `GET/PATCH /api/v1/profiles/current` | Read or update authorized profile controls |
| `POST /api/v1/maps/explore` | Rank destinations and generate all routes |
| `POST /api/v1/maps/build` | Direct server contract for one selected destination |
| `GET /api/v1/maps/{id}` | Reopen an available map |
| `PATCH /api/v1/maps/{id}` | Validate and explicitly save map state and edits |
| `POST /api/v1/maps/{id}/regenerate` | Apply feedback and generate a new map |
| `POST /api/v1/maps/{id}/feedback` | Record structured recommendation feedback |
| `GET /api/v1/roles/{id}` | Return taxonomy and PIT market detail for one role |

The browser does not call `/maps/build` during mode switching because Explore
already includes build routes. The endpoint remains useful for direct API
clients and future lazy-loading.

## 16. Five-minute demo script

### 0:00 to 0:30 - Problem and boundary

Say:

> Career tools usually ask users to name a job first. PathIn works when the
> user is uncertain. It converts evidence they control into multiple
> explainable directions, not a hiring prediction.

Show the home boundaries and quick checks.

### 0:30 to 1:15 - User control

Open the profile.

Show:

- Fourteen evidence toggles
- Social and analytics exclusion
- Only supplied skills and honors

Say:

> The broader fixture proves that PathIn uses an allowlist. The profile can
> contain analytics or social fields, but ranking receives only enabled
> professional evidence.

### 1:15 to 1:45 - Resume is optional

Open Career Tree and generate without a resume.

Say:

> The connected profile is sufficient. A resume is optional evidence. For a
> screenshot, OCR runs in the browser and only text is sent to Flask.

### 1:45 to 2:45 - Explain one recommendation

Open a skill or destination.

Show:

- Fit
- Skills
- Evidence
- Uncertainty
- Live LinkedIn Learning search

Say:

> This is deterministic, component-scored output. The historical component is
> only five percent, and sparse transitions are suppressed below 20 synthetic
> profiles.

### 2:45 to 3:30 - Navigation

Show:

- Up/down path depth
- Left/right destination switching
- Web view, zoom, and center

### 3:30 to 4:30 - Build My Path

Show:

- Two routes to one goal
- Move a step
- Add a recommended node
- Add and edit a custom step
- Reset

Say:

> Explore answers "what could I do?" Build answers "how could I get there?"
> Both modes use routes already generated by Flask.

### 4:30 to 5:00 - Save and restore

Save, reload, and open the saved path from onboarding.

Say:

> The browser snapshot is the reliable hackathon persistence layer. The
> server also writes SQLite, but Vercel `/tmp` is not production durability.

## 17. Judge questions and strong answers

### Is this actually AI?

It is an explainable decision system using normalization, semantic concept
matching, weighted ranking, taxonomy adjacency, and route generation. It does
not currently use an LLM. That is deliberate because judges can inspect every
reason and the product avoids fabricated career claims.

### Why not use an LLM?

An LLM could improve language variety later, but only after structured facts,
scores, and citations are fixed. In this version, deterministic generation is
easier to audit, test, and defend.

### What makes a recommendation personalized?

Enabled skills, roles, responsibilities, projects, education, interests,
goals, industries, work styles, constraints, evidence quality, and seniority
all affect the score or route. Domain themes can also combine with demonstrated
portable capabilities when the evidence clears explicit thresholds.

### How do interdisciplinary recommendations work?

PathIn does not concatenate random interests with job titles. It requires a
supported domain, a shared portable capability, and role-skill anchors. The UI
shows the domain evidence and capability themes, while the route still exposes
the missing role skills.

### Is the score a probability?

No. It is a weighted fit score from 0 to 100, not the probability of getting
hired.

### What is confidence?

Confidence measures how strongly the available profile completeness and market
evidence support the score. It is separate from fit.

### What stops popularity from controlling the result?

Historical transitions are only 5 percent. Skill and responsibility evidence
are 45 percent combined. The engine also diversifies credible role families.

### How do you handle bias?

The engine excludes demographics, analytics, social graphs, endorsements,
private messages, and viewer suggestions. Historical counts are low weight and
privacy screened. The UI exposes uncertainty and supports biased/unsafe
feedback.

### Why is the resume optional?

Requiring a resume excludes early-career users and contradicts the connected
profile use case. PathIn generates from any usable enabled source and treats a
resume as extra evidence.

### Do you scrape LinkedIn?

No. The current profile is a user-supplied fixture. URLs are not scraped and
credentials are never requested.

### Is PIT live?

The API attempts to fetch the live synthetic PIT files and caches aggregates
for one hour. If unavailable, it uses a labeled deterministic snapshot.

### Why suppress fewer than 20 transitions?

Small cohorts are unstable and can expose overly specific synthetic histories.
The UI reports that evidence is limited without exposing an exact count.

### What happens with sparse evidence?

The engine lowers confidence, describes the evidence as limited, avoids fake
strengths, and uses goals or taxonomy adjacency for a conservative fallback.

### What happens if only one role survives exclusions?

Explore returns a clear error asking for broader evidence or fewer exclusions,
because a comparison product should not pretend one option is a comparison.

### Why are there exactly two Build routes?

Two strategies are enough to demonstrate meaningful agency without
overwhelming the user: build proof directly or bridge through adjacent
responsibility. The data model supports more.

### Why preload Build routes?

It makes mode switching instant, preserves edits, and avoids a network request
for every tab change. The direct `/maps/build` endpoint remains available for
future lazy loading.

### Are custom edits really saved?

Yes. Before saving, the frontend materializes node edits, custom nodes, and
path order. Flask validates the structure, writes the server copy, and returns
the exact saved map used for the browser snapshot.

### Does save survive a backend restart?

The browser snapshot does. The deployed SQLite copy is best effort because
Vercel `/tmp` is ephemeral. Production needs durable authenticated storage.

### Why show LinkedIn Learning?

It connects a visible skill gap to an action. The links are live searches, not
hardcoded course claims.

### What is the biggest production gap?

Authentication plus durable per-user persistence. The next production step is
OAuth or account authentication, Postgres, durable feedback, rate limiting,
and observability.

### How would this scale?

Cache PIT aggregates outside each instance, move profile/maps/feedback to
Postgres, add request tracing and rate limits, precompute taxonomy indexes,
and split parsing into an isolated worker for large volume.

### How do you know the text is not nonsense?

The engine has adversarial tests across every taxonomy target, validates graph
references, checks score bounds, and grounds text in profile facts, taxonomy
facts, or computed gaps. Displayed strengths are checked against supplied
profile values, and sparse evidence uses explicit uncertainty language.

## 18. Verified stress evidence

Current automated baseline:

- 56 backend tests passing
- 50 frontend tests passing
- Frontend lint passing
- Production Next.js build passing
- npm audit: zero known vulnerabilities

Browser workflows verified:

- Home and all host-boundary buttons
- Profile dialogs and all 14 evidence controls
- Profile-only generation
- Resume plus LinkedIn-export generation
- TXT, PDF, DOCX, and PNG OCR uploads
- Extension, empty-file, and 5 MB rejection
- Focus and Web navigation
- Every detail tab
- Pin, alternatives, feedback, and Not for me
- Route drag/reorder, reset, add, edit, and remove, with button fallbacks
- Save payload contains custom edits
- Reload and direct restore
- Explicit regeneration
- Desktop and 390 px mobile layouts
- No browser console, page, request, or API errors in the passing runs

Load and structural stress:

- 52 concurrent generations with 52 distinct request fingerprints and map IDs
- 53 targeted and cross-domain maps containing 102,633 generated string values
- 774 nodes, 882 edges, and 322 paths checked in that corpus
- All 26 taxonomy roles targeted
- Every exact target ranked first
- Zero structural, grounding, malformed-copy, or placeholder-string errors in
  that corpus
- 20 concurrent saves
- Graph node/path references validated
- Scores and score components validated from 0 to 100
- Unsupported update, invalid destination, and missing-map errors validated

The current 12-worker in-process API stress run had a 3.55-second median,
4.17-second p95, and 4.60-second maximum generation time. Twenty concurrent
saves had a 66.3-millisecond median and 81.8-millisecond p95. Single-user
generation is faster, and the frontend no longer adds artificial wait time
after the API response.

## 19. Honest limitations to volunteer

1. The current profile is a hardcoded user-supplied fixture.
2. There is no production authentication or real LinkedIn OAuth.
3. PIT is synthetic and cannot prove real labor-market outcomes.
4. The taxonomy currently contains 26 roles.
5. Vercel SQLite under `/tmp` is not durable cross-instance storage.
6. Browser saves are same-browser, not cross-device.
7. Feedback is not durably persisted.
8. LinkedIn Learning links are searches, not course availability guarantees.
9. The scoring weights are product judgments and need user research.
10. The system is decision support, not hiring, legal, or financial advice.

Being explicit about these limits is stronger than overclaiming.
