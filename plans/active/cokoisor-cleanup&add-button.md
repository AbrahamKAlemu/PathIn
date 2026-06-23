# Plan: Home Page Scroll Fix + "Explore PathIn" Button

## Overview

Two focused UI changes to the Next.js frontend (`/frontend`):

1. **Make the home page scrollable** — the current layout clips content below the viewport. The three-column layout (left profile sidebar, center feed, right news panel) needs overflow and height constraints fixed so the page scrolls naturally as the feed grows.
2. **Add an "Explore PathIn" button** to the top dashboard/navbar area — clicking it navigates to `/pathin`, the career path map page (to be built separately). The button should feel like a native LinkedIn nav action, not an afterthought.

---

## Scope

- Frontend only (`/frontend`). No backend changes needed for this plan.
- No new routes need to be created yet — the button just links to `/pathin`. The PathIn page itself is out of scope here.
- Preserve all existing layout structure and component hierarchy your teammate built.

---

## Files to Change

### 1. `frontend/src/app/page.tsx`
- The root layout wrapper has `h-screen overflow-hidden` or equivalent. Change the outer container to `min-h-screen` so it expands with content instead of clipping it.
- If columns are set to `h-full` or `h-screen`, change the **center feed column** to `overflow-y-auto` and remove any fixed heights so it grows naturally.
- The **left and right sidebars** can stay sticky: use `sticky top-0 h-screen overflow-y-auto` on each sidebar so they stay in view while the feed scrolls.
- Do not touch the navbar — it's handled separately.

**Target classes to find and fix (approximate — adjust to match actual code):**
```
// Before (likely something like):
<div className="flex h-screen overflow-hidden">

// After:
<div className="flex min-h-screen">
```

```
// Left/right sidebars:
<aside className="sticky top-16 h-[calc(100vh-64px)] overflow-y-auto w-64 shrink-0">

// Center feed:
<main className="flex-1 overflow-y-auto py-4">
```

### 2. `frontend/src/app/layout.tsx`
- Make sure `<body>` does not have `overflow-hidden`. It should be `overflow-x-hidden` at most, so vertical scrolling is never suppressed.
- If there's a global wrapper div here, ensure it uses `min-h-screen` not `h-screen`.

### 3. `frontend/src/components/Navbar.tsx` (or wherever the top nav lives)
- Add an "Explore PathIn" button to the right side of the navbar, between the existing nav icons and the profile avatar.
- Style it to match the LinkedIn nav aesthetic: compact, icon + label, uses the site's teal/blue accent color on hover.
- On click, route to `/pathin` using Next.js `<Link href="/pathin">`.
- The button should have a map/route icon (use a Heroicon or inline SVG — `MapIcon` or a path branching icon works well).
- Add an `active` state highlight if the current path is `/pathin` (use `usePathname()` from `next/navigation`).

**Example implementation:**
```tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapIcon } from '@heroicons/react/24/outline' // or whichever icon lib is installed

// Inside the navbar JSX, after the existing nav icons:
const pathname = usePathname()

<Link
  href="/pathin"
  className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors
    ${pathname === '/pathin'
      ? 'text-black border-b-2 border-black'
      : 'text-gray-500 hover:text-black'
    }`}
>
  <MapIcon className="w-6 h-6" />
  <span>PathIn</span>
</Link>
```

> **Note:** If the navbar is not yet a separate component and lives inline in `page.tsx` or `layout.tsx`, extract it into `frontend/src/components/Navbar.tsx` first, then add the button. This also makes it reusable on the PathIn page itself.

---

## Alternatives Considered

| Option | Why not chosen |
|---|---|
| Use `overflow-y-scroll` on `<body>` | Too blunt — suppresses fine-grained column scroll control |
| Make only the feed column scroll inside a fixed container | Feels unnatural on mobile; native page scroll is simpler and more accessible |
| Add PathIn button as a floating action button (FAB) | FABs are off-brand for LinkedIn's nav pattern; a nav icon keeps it consistent |
| Add PathIn as a sidebar link instead of navbar | Navbar placement gives it equal weight to core LinkedIn features, which is the right signal for a hackathon demo |

---

## Possible Errors / Gotchas

- **`h-screen` on a parent kills scrolling** — the most common culprit. Search the whole component tree for `h-screen` and audit each one. Only the sticky sidebars should use it.
- **Tailwind v4 syntax differences** — this project uses Tailwind CSS v4. Some utility names or config patterns differ from v3. Avoid `@apply` in component files if it's causing issues; prefer inline class strings.
- **`usePathname()` requires a Client Component** — if the Navbar is a Server Component, add `'use client'` at the top when adding the active-state logic.
- **`/pathin` route doesn't exist yet** — the button will work (it's just a link), but navigating to it will 404 until the PathIn page is built. That's fine for now; you can add a placeholder `frontend/src/app/pathin/page.tsx` that returns a coming-soon message so the link doesn't hard-error during the demo.
- **Icon library** — confirm whether `@heroicons/react` is installed (`package.json`). If not, use a simple inline SVG or `lucide-react` (commonly included in Next.js projects) instead. `lucide-react` equivalent: `import { Map } from 'lucide-react'`.

---

## Suggested Placeholder for `/pathin`

Create `frontend/src/app/pathin/page.tsx` with a stub so the button doesn't 404:

```tsx
export default function PathInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500 text-lg">PathIn map coming soon.</p>
    </main>
  )
}
```

Replace this with the real career map component once that feature is built.

---

## Additional UI Cleanup (from screenshot audit)

These are visible issues on the current home page beyond scrolling. Address them in `page.tsx` and any relevant child components.

### 1. Hard bottom cutoff / dead white space below the feed
The page ends abruptly with a large blank white area below the single post. This is likely caused by the feed container having a fixed height that doesn't grow with content, combined with no posts being rendered below the first one.
- Ensure the feed container is `flex flex-col gap-4` with no fixed height so posts stack naturally
- If posts are being rendered from a static/mock array, make sure the array has enough entries to visually fill the feed and demonstrate scrolling during the demo
- Consider adding a subtle "You're all caught up" end-of-feed message at the bottom instead of raw white space

### 2. Left sidebar — orphaned logo at the bottom
There is an unidentified dark hexagonal logo floating at the bottom of the left sidebar with no label, context, or card wrapper. It appears to be a leftover placeholder or an ad/sponsor widget stub.
- Either remove it entirely, or wrap it in a proper card with a label (e.g. "Sponsored" or a mock ad card matching LinkedIn's style)
- If it's meant to be a "Your Premium features" visual, move it inside that card above it and give it a label
- Do not leave unlabeled floating elements — judges will notice

### 3. Right sidebar — content clipping near bottom
The "Today's puzzles" section is very close to the viewport bottom edge and likely clips when the sidebar reaches its height limit.
- Apply `overflow-y-auto` to the right sidebar so it can scroll independently if its content exceeds the viewport
- Or simply allow the right sidebar to be `sticky top-16` with `max-h-[calc(100vh-64px)] overflow-y-auto` so puzzle entries are always reachable

### 4. Single post in feed looks sparse
Only one post is visible in the center feed, making the page feel empty and unfinished. For the demo this will look like a broken feed.
- Add 3–5 additional mock post objects to the feed data/array so the feed looks populated
- Posts don't need real content — use varied mock data (different users, text lengths, one with just text, one with an image) to simulate a real feed
- This is purely frontend mock data, no backend call needed

### 5. "Messaging" floating button overlaps content
The bottom-right Messaging bubble sits on top of the feed content with no breathing room. If the page becomes scrollable, this is fine — but ensure it's `fixed bottom-4 right-4 z-50` so it doesn't interfere with the layout flow.

### 6. Post action bar alignment
The Like / Comment / Repost / Send actions at the bottom of the post card appear evenly spaced but check that they are `flex justify-around` or `justify-between` with consistent padding — on narrower screens this can collapse awkwardly. Add `flex-wrap` as a safety net.

---

## Definition of Done

- [ ] Home page feed scrolls naturally without clipping
- [ ] Left and right sidebars remain visible (sticky) while scrolling
- [ ] "PathIn" button appears in the top navbar
- [ ] Clicking it navigates to `/pathin`
- [ ] Button shows active highlight when on the `/pathin` route
- [ ] No hard bottom cutoff — feed ends with a graceful "all caught up" message
- [ ] Orphaned logo in left sidebar is removed or properly labeled
- [ ] Right sidebar scrolls independently if content overflows viewport
- [ ] Feed has at least 4 mock posts so it looks populated
- [ ] Messaging button is `fixed` and doesn't disrupt layout flow
- [ ] Post action bar is flex-wrapped and doesn't break on narrower viewports
- [ ] No layout regressions on the existing home page UI