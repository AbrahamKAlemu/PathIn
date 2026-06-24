# Home Page Cleanup & PathIn Button

**Author:** cokoisor  
**Status:** Complete  all tasks shipped

---

## What Was Done

### Scrolling & Layout
- Confirmed `page.tsx` already used `min-h-screen` � no change needed there
- Added `self-start sticky top-16 h-[calc(100vh-64px)] overflow-y-auto` to both sidebars
- `self-start` was the critical fix � without it, CSS grid stretches children to fill the full column height, which prevents `sticky` from activating

### PathIn Nav Button
- Added `'use client'` + `usePathname()` to `header.tsx`
- Added a `<Link href="/pathin">` with a custom map-pin icon as the 9th nav column
- Updated nav grid from `grid-cols-8` to `grid-cols-9`
- Added `a:nth-child(9)` to the `=1180px` hide rule in `globals.css`
- Created stub `app/pathin/page.tsx` with a "coming soon" message
- **Later removed** � the real `/pathin` page was built out by the team, so the stub button and page were cleaned up. `header.tsx` was reverted to `grid-cols-8` with hardcoded `active: true` on Home.

### Left Sidebar
- Removed the orphaned Simulate logo card at the bottom of `profile-sidebar.tsx` (was a section with just an image and no label or context)

### Feed
- Added 4 mock posts with varied content:
  - `FeedPostCareerAdvice` � long-form text (Maya Johnson, Google SWE)
  - `FeedPostAnnouncement` � short announcement (Marcus Williams, Stripe intern)
  - `FeedPostImage` � image post (Priya Patel, Figma PM) using `/linkedin/post-building.png`
  - `FeedPostThought` � medium text (James Rodriguez, startup founder)
- Fixed post action bar: `grid grid-cols-4` ? `flex flex-wrap justify-around`
- Added icons to Like / Comment / Repost / Send (thumbs-up, speech bubble, cycle arrows, paper plane) � new icon entries in `icons.tsx`
- Added "You're all caught up ?" end-of-feed message
- Extracted `PostActionBar` as a shared component used by all 5 posts

### Right Sidebar
- Changed `news-sidebar.tsx` from forced full height to auto height (`self-start sticky top-16 overflow-y-auto`)
- Reduced news headline size: `text-[18px]` ? `text-[14px]`
- Reduced meta (time/readers) size: `text-[16px]` ? `text-[12px]`
- Wrapped "Today's puzzles" section in its own closed card (`border rounded-[8px]`)
- Tightened padding to reduce overall sidebar footprint

### Messaging Button
- Changed position from `bottom-0 right-0` to `bottom-4 right-4` (floating with gap)

### Typography
- Switched global font from `Arial, Helvetica, sans-serif` to `Source Sans 3` via `next/font/google` in `layout.tsx`
- Removed `font-bold` from all non-heading text: labels, stats, buttons (Follow, Like/Comment/Repost/Send, Start a post, View all analytics, Profile viewers, Wend #15, Show all news, Messaging, etc.)
- Kept `font-bold` on: `h1/h2/h3` headings, person names in posts, news article titles
- Reduced profile username size: `text-[23px]` ? `text-[18px]`
- Reduced search bar placeholder: `text-[16px]` ? `text-[13px]`

### Logo
- Replaced the hardcoded LinkedIn `in` div in `LinkedInLogo` with a `next/image` `<Image>` pointing to `/pathin-logo.png` � drop the file into `public/` to activate

---

## Files Modified

| File | Summary |
|---|---|
| `src/app/layout.tsx` | Source Sans 3 font via `next/font/google` |
| `src/app/globals.css` | Removed Arial; updated nav hide rules |
| `src/components/linkedin/icons.tsx` | Added `like`, `comment`, `repost`, `forward` icons; updated `LinkedInLogo` to use image |
| `src/components/linkedin/header.tsx` | Reverted to pre-PathIn state after button was removed |
| `src/components/linkedin/feed.tsx` | 4 new posts, `PostActionBar` with icons, end-of-feed message, action bar flex fix |
| `src/components/linkedin/profile-sidebar.tsx` | Sticky classes, removed orphaned logo, smaller username |
| `src/components/linkedin/news-sidebar.tsx` | Sticky classes, smaller text, puzzle card, auto height |
| `src/components/linkedin/messaging.tsx` | `bottom-4 right-4` float position, unbolded label |

---

## Definition of Done

- [x] Feed scrolls naturally, sidebars stay sticky
- [x] Orphaned sidebar logo removed
- [x] Feed has 5 posts (1 original + 4 mock)
- [x] Post action bar flex-wraps on narrow screens
- [x] Like / Comment / Repost / Send have icons
- [x] "You're all caught up ?" end-of-feed indicator
- [x] Messaging button floats with gap from corner
- [x] Right sidebar content no longer clips
- [x] Non-heading text unbolded throughout
- [x] Font switched to Source Sans 3
- [x] PathIn nav button added then removed (real page built by team)
