# Path[IN] Interactive Career Bubble Map Prototype Prompt

## Product Overview

Design and implement a LinkedIn-integrated feature called Path[IN] for
students, Gen Z users, early-career professionals, and career changers who do
not yet have a clear career plan.

Path[IN] should analyze user-controlled profile information such as education,
coursework, work history, projects, skills, interests, location, and career
goals. It should turn those signals into an interactive map of possible career
routes. The map must help the user understand:

- Where they are now.
- Which careers may fit their current background and interests.
- Which courses, skills, projects, experiences, and entry roles could move
  them toward each career.
- How one step may connect to the next.
- Which alternative routes remain available if they change direction.
- Why each route or step was recommended.

The product must present routes as possibilities, not predictions or
guaranteed outcomes. It should feel like a native LinkedIn feature rather than
a separate whiteboard, game tree, or generic mind-map application.

## Primary User

Use Winston Iskandar as the prototype profile:

- Education: Computer Science and Mathematics at Stanford University.
- Current imported experience: Similate, Inc.
- Earlier imported experience: Jane Street.
- Existing skill signals: software problem solving, quantitative reasoning,
  and technical communication.
- Interests: AI, product, and career discovery.
- Location: United States.
- Current goal: explore several technical careers before choosing one.

Do not invent Winston's job titles, employment dates, responsibilities,
achievements, compensation, or seniority. When imported profile data does not
include those facts, identify the missing context and let Winston add it
through profile controls.

## Core Product Promise

Path[IN] should transform career uncertainty into an understandable set of
experiments and routes. The interface should let the user explore broadly
without making every possibility equally large or overwhelming.

The visual hierarchy must combine two needs:

1. A focused experience where exactly one node is dominant at a time.
2. A complete Web view where the user can inspect all active routes and move
   around the connected map.

The two views must share the same nodes, route selection, focused state, and
details. Switching views must not reset the user's place.

## Directional Mental Model

Use a consistent bottom-to-top career model in both views:

- Up means possible future steps and outcomes.
- Center means the node currently in focus.
- Down means the user's profile foundation, prior history, or already
  traversed steps.
- Left and right reserve space for alternative branches at a comparable
  stage, but remain empty scaffolding in this prototype.

The map should begin with `Your current standing` in focus. Future routes grow
upward from that point. Profile context continues downward beneath it.

## View 1: Focus

### Purpose

Focus view is the default. It should let the user study one node without
losing awareness of the larger map.

### Required Layout

Render the view vertically in this order:

1. A `Possible career goals` layer at the top.
2. Two compact alternative-goal buttons.
3. One centered, highlighted recommended-goal bubble that acts as the visible
   destination endpoint for the selected route.
4. A short upward connector between the recommendation stack and the selected
   goal.
5. One small preview of the node two steps ahead.
6. A short upward connector.
7. One small preview of the immediate next node.
8. An up-arrow control for moving one connected step forward.
9. One large focused node in the center.
10. Small empty left and right arrow scaffolds for future branching.
11. A down-arrow control for moving one connected step backward.
12. One small preview of the immediate previous node.
13. A short downward connector.
14. One small preview of the node two steps back.

Do not enlarge multiple nodes at the same time. Exactly one node is the visual
focus.

The composition should resemble a vertical connected map, not a horizontal
catalog. The previews, arrows, focused node, and connectors must share one
center axis.

### Career Goal Layer

The top of Focus view must make the route destination explicit rather than
hiding it in route metadata:

- Show the selected recommended career goal as a centered destination bubble.
- Place the other possible career goals above it as compact alternatives.
- Keep the selected goal visually aligned with the vertical recommendation
  stack beneath it.
- Label the selected bubble `Recommended goal` and the alternatives
  `Possible goal`.
- Show the selected route name beneath the active goal.
- Clicking any goal switches to the route associated with that destination,
  makes the destination the focused center node, recomputes the surrounding
  previews, and keeps the details drawer closed.
- Goal selection must work in both Explore and Build My Path modes.
- Treat goals as possibilities, not guaranteed outcomes.

### Future Preview Stack

Show exactly two compact positions above the center node:

- The preview nearest the center is the immediate next connected step.
- The preview above it is the step after that.
- If either step does not exist, render a quiet dashed endpoint scaffold in
  that position.
- Draw a visible vertical connector and upward arrow direction between them.
- Keep both previews significantly smaller than the center node.

Each real preview should show:

- Its relationship to the center, such as `Next step` or `Two steps ahead`.
- A short node title.
- A concise stage label.

Each real preview must be directly clickable. Clicking it should:

- Move that preview into the large center focus.
- Recompute the two previews above and two previews below.
- Keep the details drawer closed.
- Move keyboard focus to the newly centered node.

### Focused Center Node

The center node is the primary interaction surface. It should:

- Be clearly larger than all four preview nodes.
- Use a strong category border and restrained shadow.
- Show a category icon and eyebrow.
- Show the node title.
- Show the node's position on the selected route.
- Show one concise summary.
- Show a subtle `Open focused details` action.
- Use LinkedIn blue for `Your current standing`.
- Use consistent category colors for courses, skills, projects, roles, and
  destinations.
- Receive keyboard focus after arrow navigation or preview selection.

Clicking the center node should open its detail drawer without changing the
focused node.

### Up and Down Navigation

The vertical arrows move along the currently selected route one connected
step at a time:

- Up moves from profile/history toward the current standing, then through the
  selected future route.
- Down moves from a future step toward the current standing and then through
  the profile foundation.
- Recompute the adjacent up/down destinations after every move.
- Disable the arrow only at the true end of that direction.
- Keep the center node focused after movement.
- Support `ArrowUp` and `ArrowDown` while the center node has keyboard focus.
- Announce the new focus in a polite live region.

The downward profile sequence should support:

1. Career interests.
2. Transferable and technical skills.
3. Education and coursework.
4. Earlier imported experience.
5. Current imported experience.
6. Combined current standing.

The upward route sequence should support as many connected steps as the
selected route contains. It must not stop after only one or two clicks.

### Left and Right Branch Scaffolding

The positions beside the center node are reserved for future same-level branch
navigation. In this prototype they must remain visual scaffolding only:

- Show one dashed left-arrow placeholder and one dashed right-arrow
  placeholder.
- Do not show `Previous route`, `Next route`, or any other visible text inside
  the placeholders.
- Do not make the placeholders clickable, focusable, or interactive.
- Keep them visually subdued and clearly secondary to the center node.
- Do not change the selected route when either placeholder is pressed because
  there should be no press behavior.
- On mobile, reduce each placeholder to a compact dashed circle containing
  only its arrow.

Users can still select different routes by selecting a route-associated node
in Web view. The side positions simply establish where future branch
navigation can be added.

### History Preview Stack

Show exactly two compact positions below the center node:

- The preview nearest the center is the immediate previous connected step.
- The preview below it is the step before that.
- If either step does not exist, render a quiet dashed profile endpoint
  scaffold.
- Draw a visible vertical connector and downward arrow direction between them.
- Keep both previews directly clickable and visually secondary.

As the user moves downward, this stack should reveal the profile sequence:
current experience, earlier experience, education, skills, and interests. As
the user moves upward into a future route, it should also show completed route
steps beneath the center.

## View 2: Web

### Purpose

Web view should reveal the complete connected structure of the active career
routes. It is the zoomed-out exploration surface for users who want to see how
all possibilities relate.

### Required Layout

Render a large map canvas inside a bounded LinkedIn-style surface:

- `Your current standing` is the central anchor.
- Every active future route branches upward.
- Each route has a visible short label.
- Courses, skills, projects, roles, and destinations appear in route order.
- The profile foundation forms one connected chain below the current node.
- Curved directional connections show how nodes lead from one to the next.
- Shared route nodes may appear on each route when that preserves readable
  route structure.

### Movement and Zoom

The user must be able to inspect a canvas larger than the viewport:

- Drag an empty area of the canvas to pan.
- Scroll vertically or horizontally with a mouse, trackpad, or touch.
- Use zoom-out and zoom-in buttons.
- Keep zoom within a useful minimum and maximum.
- Provide a control that recenters the canvas on `Your current standing`.
- Show the current zoom percentage.
- Use grab and grabbing cursors on desktop.
- Keep native touch scrolling usable.
- Do not allow the oversized canvas to create page-level horizontal overflow.

Opening Web view should initially center the current-standing node in the
viewport.

### Web Node Interaction

Every Web view bubble must be a real button. Clicking a bubble should:

- Select that node.
- Select its associated route when applicable.
- Highlight it as the active node.
- Open the same detail drawer used by Focus view.
- Preserve the selection if the user switches back to Focus view.

Use circular map bubbles with clear type colors. The current-standing bubble
should be slightly larger and use LinkedIn blue.

## Product Modes

### Explore

Explore mode should help a user compare multiple career families without first
choosing a destination.

Default Winston routes:

- Project-first route toward data science.
- Discovery-first route toward product management.
- Portfolio-first route toward product design.

Explore mode should make all three active routes available in Focus and Web
views.

### Build My Path

Build My Path mode should let the user select a destination and compare
concrete routes toward it.

Prototype destinations:

- Senior Data Scientist.
- Product Manager.
- Product Designer.

Changing the destination should:

- Load the available routes for that destination.
- Return focus to `Your current standing`.
- Update both Focus and Web views.
- Preserve the selected product mode.

## Node Information Model

Each node should have enough structured information for a useful details
drawer:

- Category and stage.
- Short summary.
- Why the step may fit the user.
- Typical responsibilities or actions.
- Existing skills that transfer.
- Transferable skills.
- Skills to build.
- A preview of what the work or activity involves.
- Common challenges or tradeoffs.
- Work setting.
- Source or evidence record.
- Salary range and hiring demand when reliable data exists.
- Similar-background examples only when privacy and evidence thresholds are
  satisfied.

Do not force all of this content into the visible bubble. The map is for
orientation; the drawer is for depth.

## Detail Drawer

The same drawer should work from both views.

Desktop:

- Present it as a persistent right-side panel or a clear right-side overlay.

Mobile:

- Present it as a bottom sheet.

Required behavior:

- Closed by default.
- Opens for the selected node.
- Shows the selected node's title, type, and route position.
- Provides Overview, Why it fits, Skills, Connections, and Evidence tabs.
- Provides previous/down and next/up connected-node controls.
- Lets the user pin a recommendation.
- Lets the user request an alternative.
- Lets the user dismiss a recommendation as `Not for me`.
- Lets the user report incorrect, misleading, biased, or unsafe content.
- Lets the user choose a destination node as the Build My Path target.
- Returns keyboard focus to the center node when closed from Focus view.

Profile nodes should open factual profile context and an edit action. They
should not expose recommendation controls that imply the user's own history
was AI-generated.

## Profile Controls and User Agency

The user must control which profile signals Path[IN] analyzes.

Provide controls for:

- Education and coursework.
- Work, projects, activities, and volunteering.
- Skills.
- Interests.
- Location preferences.
- Career goals.

For each category:

- Show whether it is enabled.
- Show whether information came from LinkedIn, was inferred, or was added by
  the user.
- Let the user edit imported information.
- Let the user leave formal work experience blank.
- Do not request demographic attributes.
- Explain that profile edits affect future regeneration.

## LinkedIn Visual Integration

The feature should look like it belongs inside LinkedIn:

- Retain the existing LinkedIn navigation.
- Present Path[IN] as a dedicated LinkedIn feature page.
- Use LinkedIn blue, white cards, warm neutral page backgrounds, gray borders,
  and restrained shadows.
- Use professional typography and compact rounded controls.
- Reuse familiar interaction patterns for tabs, save actions, drawers, and
  profile editing.
- Keep the Path[IN] identity visible without creating an unrelated brand
  system.
- Avoid neon colors, playful game UI, or an unstructured whiteboard look.

The map itself may be spatial and expressive, but its frame and controls
should remain recognizably LinkedIn.

## Recommendation Content

The prototype should contain substantive, useful routes rather than generic
`future scenario` placeholders.

Each future path should combine several kinds of steps:

- A low-cost learning step.
- A specific skill bridge.
- A project, portfolio, club, research, or work experiment.
- An entry role.
- Optional intermediate roles.
- A longer-term destination.

Recommendations may include:

- Courses.
- Scholarships.
- Student clubs.
- Research opportunities.
- Projects.
- Networking targets.
- Alumni or professionals to learn from.
- Internships and entry-level roles.
- Transferable-skill explanations.
- Alternative branches.

The first prototype should prioritize visualization and route comprehension.
Detailed financial cost comparison, time-to-completion estimates, and
side-by-side return-on-investment analysis can be later additions. Do not show
fabricated costs in this version.

## Data and Evidence Rules

Use real profile history only when it is available and user-authorized. Use the
PIT dataset as aggregate prototype evidence.

Required safeguards:

- Label the PIT source as synthetic.
- Do not present synthetic transitions as real LinkedIn member outcomes.
- Do not expose identifiable member histories.
- Use anonymized or aggregated similar-background examples.
- Suppress sparse cohort counts below the privacy threshold.
- Clearly distinguish observed evidence, inferred relationships, and
  Path[IN]-generated recommendations.
- Explain why each route was recommended.
- Preserve source, data version, model version, and prompt version metadata.
- Never describe a route as guaranteed, optimal, or inevitable.
- Avoid making salary or demand claims without a reliable source.

## Bias and Fairness

Historical career data can reproduce unequal access and representation.
Path[IN] should not simply recommend the most common historical outcome.

The prototype should:

- Offer multiple plausible routes.
- Include project-first and lower-barrier paths that do not require a prior
  prestigious title.
- Avoid using protected demographic attributes.
- Let users remove or correct profile signals.
- Let users dismiss routes and request alternatives.
- Explain recommendation factors.
- Avoid ranking one route as the universally best choice.
- Provide a feedback route for biased or unsafe recommendations.
- Treat sparse historical evidence as uncertainty, not proof that a path is
  unsuitable.

## State and Persistence

Save enough browser state to restore the user's map:

- Product mode.
- Focus or Web view.
- Destination.
- Focused route.
- Focused node.
- Detail tab and drawer state.
- Active Explore routes.
- Pinned nodes.
- Dismissed nodes.
- Enabled profile signals.
- Edited profile snapshot and provenance.
- Web zoom level.

Validate saved state against the current data, model, and prompt versions.
Reject or reset invalid node and path identifiers rather than rendering a
broken map.

## Responsive Behavior

### Desktop

- Use the available LinkedIn content width.
- Keep the center node approximately 340 to 360 pixels wide.
- Keep two compact preview nodes above and two below the center node.
- Keep every preview, connector, and vertical arrow aligned to one center axis.
- Keep empty left and right arrow scaffolds visible beside the center node.
- Give Web view a tall, bounded viewport.
- Use a right-side details experience.

### Tablet

- Preserve all controls.
- Reduce horizontal gaps before shrinking the center node.
- Keep the Web viewport scrollable.
- Keep preview nodes large enough for touch.

### Mobile at 390 Pixels

- Do not create page-level horizontal overflow.
- Keep the map card edge-to-edge.
- Keep mode and view controls usable in the toolbar.
- Reduce left/right branch scaffolds to compact dashed circles.
- Fit the center node between those controls.
- Keep the two previews above and below compact but readable.
- Preserve the vertical connected-map structure without page-level horizontal
  scrolling.
- Keep the Web canvas larger than its viewport while containing overflow
  inside the viewport.
- Use a bottom-sheet detail drawer.
- Keep all touch targets at least approximately 34 to 44 pixels.

## Accessibility

- Use semantic buttons for every node and control.
- Provide accessible labels that name navigation destinations.
- Use `aria-pressed`, `aria-selected`, or `aria-current` where appropriate.
- Support keyboard traversal of preview nodes and Web nodes.
- Support `ArrowUp`, `ArrowDown`, `Enter`, `Space`, and `Escape`.
- Maintain visible focus indicators.
- Announce selected-node changes through a polite live region.
- Keep text and controls at sufficient contrast.
- Do not communicate node type with color alone; include icons and text.
- Respect reduced-motion preferences.
- Remove hover transforms when reduced motion is enabled.

## Performance and Interaction Quality

- Keep panning and scrolling responsive.
- Avoid rerendering or recalculating the complete map during every pointer
  movement.
- Use a single pointer-drag state for Web panning.
- Keep node identity stable across view switches.
- Keep route and layout calculations deterministic.
- Prevent node clicks from starting a canvas drag.
- Make scrollbars available even when custom drag panning exists.
- Keep the current-standing recenter action reliable after zoom changes.

## Empty and Error States

- If no earlier history exists, show a quiet `No earlier profile step` bubble.
- If a route ends, disable only the corresponding vertical arrow.
- Keep left/right branch scaffolds non-interactive regardless of route count.
- If live PIT data cannot load, use the labeled aggregate snapshot.
- If a saved map is outdated, remove it and explain that a new save is needed.
- If a profile field is missing, ask the user to add it rather than inferring a
  specific title, date, or outcome.

## Non-Goals for This Prototype

- Do not guarantee career outcomes.
- Do not auto-apply to jobs, scholarships, or courses.
- Do not fabricate real professional histories.
- Do not expose raw member-level PIT records.
- Do not infer protected demographic attributes.
- Do not provide a detailed cost or ROI comparison yet.
- Do not require every future product idea to fit inside the first map.
- Do not replace professional, academic, immigration, or financial advice.

## Acceptance Criteria

### Focus View

- Opens with `Your current standing` as the one large focused node.
- Shows Senior Data Scientist, Product Manager, and Product Designer as
  possible career goals at the top of the recommendations.
- Shows the selected goal as a centered, highlighted endpoint above the route.
- Clicking a possible goal switches to that destination's route and focuses
  the destination node.
- Shows the immediate next step and the step after it as small previews above.
- Shows the immediate previous step and the step before it below.
- All four preview positions align vertically with the focused node.
- Clicking a real preview makes it the focused center node.
- Recomputes all surrounding previews after every focus change.
- The up arrow can move through the complete selected future route.
- The down arrow can move through the complete profile/history sequence.
- Left and right appear only as empty dashed arrow scaffolds.
- The side scaffolds contain no `Previous route` or `Next route` text and have
  no click behavior.
- Clicking the center node opens its details.

### Web View

- Shows all active paths as connected branches.
- Shows profile context below current standing.
- Shows future route steps above current standing.
- The canvas is larger than the viewport where needed.
- The user can drag, scroll, and zoom around it.
- The user can recenter on current standing.
- Every node is clickable.
- Clicking a node selects it, highlights it, and opens details.
- Switching back to Focus view preserves that node and route.

### Product Behavior

- Explore mode shows data, product, and UX routes.
- Build My Path shows routes toward the selected destination.
- Node details contain meaningful information and evidence labels.
- Profile controls are editable and user-controlled.
- Save and reopen preserve both views and Web zoom.
- Dismiss, pin, alternative, regenerate, and feedback actions remain usable.
- The interface labels routes as possibilities.
- The interface identifies the PIT source as synthetic.

### Responsive and Accessible Behavior

- Desktop and 390-pixel mobile layouts have no page-level horizontal
  overflow.
- Web overflow stays inside its intended container.
- All controls are keyboard accessible.
- Keyboard focus follows focused-node navigation.
- Screen-reader status text announces changes.
- Reduced-motion mode removes unnecessary movement.
