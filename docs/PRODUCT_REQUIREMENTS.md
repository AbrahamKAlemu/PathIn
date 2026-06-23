# Path[IN] Product Requirements Document

**Status:** Working product specification
**Version:** 1.0
**Date:** June 23, 2026
**Primary audience:** Product, design, frontend, backend, data, AI/ML, privacy, and research
**Initial implementation:** Next.js frontend and Flask backend

---

## 1. Executive Summary

Path[IN] is an AI-powered LinkedIn career exploration feature for students and Gen Z users who are uncertain about their career direction. It turns a user's education, work history, projects, volunteer experience, skills, interests, location, and goals into an interactive career map made of connected bubbles.

The map begins with the user's current standing and branches into plausible experiences, skills, internships, entry-level jobs, intermediate positions, and longer-term career destinations. It is intended to answer four questions:

1. What careers might fit me?
2. Why might those careers fit me?
3. What could those careers actually look like?
4. What are several realistic ways I could move toward them?

Path[IN] supports two primary modes:

- **Explore:** The system recommends several career destinations and lets the user investigate what each path could look like.
- **Build My Path:** The user chooses a destination and the system generates multiple possible routes from the user's current standing to that destination.

The paths are informed by anonymized and aggregated career histories from real professionals with similar starting backgrounds. They are possibilities supported by evidence, not predictions, promises, or prescriptions. Users can inspect why a role or step was recommended, see which existing skills transfer, discover gaps, expand alternative branches, and reject or regenerate suggestions.

The first release is a visualization-first MVP. It must make career paths understandable, interactive, explainable, and personally relevant. Later releases may add live courses, scholarships, school clubs, networking opportunities, job listings, salary and demand information, path cost and time estimates, application tracking, and side-by-side comparison.

---

## 2. Confirmed Product Decisions

The following decisions are already made and should be treated as requirements unless deliberately revised:

| Area | Decision |
| --- | --- |
| Primary audience | Students and Gen Z users |
| Core user problem | The user does not have a clear career plan |
| Discovery behavior | Support automatic recommendations and user-selected destinations |
| Historical evidence | Use real, properly authorized LinkedIn-style career histories |
| Data presentation | Show anonymized, aggregated patterns rather than identifiable individuals |
| Initial product focus | Interactive career path visualization |
| Initial path format | Connected bubbles or nodes with branching relationships |
| Future comparison | Compare paths by cost, time, difficulty, salary, and other factors later |
| Frontend | Next.js |
| Backend | Flask |

---

## 3. Product Vision

Path[IN] should make career planning feel understandable and explorable to a student who has limited work experience, limited professional context, or no fixed destination.

Most career products begin by asking the user to name a target job. Path[IN] should also work when the user cannot name one. It should help the user move from:

> "I do not know what I want to do."

to:

> "I can see several careers that may fit me, understand why, and identify realistic next steps I could take."

The product is not merely a list of job titles. Its core value is showing relationships:

- How a current skill can transfer into a new role
- How an internship can create access to an entry-level job
- How one role commonly leads to another
- How different people reached the same destination through different routes
- How a user can pivot when one branch is unavailable or undesirable
- How education, projects, clubs, volunteering, and work can all contribute to a path

Long term, Path[IN] can become a personalized career navigation layer within LinkedIn. It can connect career discovery to learning, networking, applications, mentorship, and opportunity discovery while preserving user agency.

---

## 4. Problem Statement

Students and early-career Gen Z users often face a combination of the following problems:

- They know subjects or activities they enjoy but do not know which careers connect to them.
- They see job titles without understanding what the work involves.
- They lack enough work history to receive useful conventional recommendations.
- They do not know which existing skills are transferable.
- They do not understand the intermediate steps between school and a desired career.
- They assume there is one correct or linear route into a profession.
- They lack access to professionals who can explain less obvious career routes.
- They encounter too much generic career content and too little personalized guidance.
- They may not know which internships, clubs, projects, courses, or entry-level roles are realistic at their current stage.
- They may be discouraged by requirements without seeing alternative ways to build equivalent evidence.
- They may not understand how location, school year, timing, or availability affects possible next steps.
- Existing professional histories can appear polished and disconnected from the decisions that produced them.
- Historical career patterns may reflect unequal access and therefore cannot be treated as neutral instructions.

The product opportunity is to transform fragmented profile and career data into an understandable, personalized, evidence-informed map.

---

## 5. Product Goals

### 5.1 Primary Goals

1. Help uncertain students discover multiple careers that fit their interests, skills, and background.
2. Help goal-directed students understand multiple plausible routes toward a selected career.
3. Make career progression visible through an interactive, branching map.
4. Explain why every major destination and transition is recommended.
5. Show that career paths are flexible, non-linear, and revisable.
6. Use real career-history patterns without exposing or reconstructing identifiable individuals.
7. Give users meaningful control over profile inputs, recommendations, and saved paths.
8. Reduce career uncertainty enough that users can identify at least one next action.

### 5.2 Secondary Goals

1. Teach users how skills transfer across roles and industries.
2. Reveal careers the user may not have known existed.
3. Help users distinguish between a role's title and its actual responsibilities.
4. Show alternative routes when the most common route is inaccessible.
5. Create a foundation for future recommendations involving learning, jobs, scholarships, clubs, and networking.
6. Generate useful signals about student career interests without forcing premature commitment.

### 5.3 Business and Platform Goals

1. Increase meaningful engagement among students and early-career users.
2. Improve discovery of LinkedIn roles, learning content, groups, events, and people in later releases.
3. Strengthen LinkedIn's value before a user has an established professional identity.
4. Create a trusted entry point for career planning that can lead to future platform activity.

---

## 6. Non-Goals

Path[IN] is not intended to:

- Guarantee employment, admission, salary, promotion, or career satisfaction.
- Predict a user's destiny or identify one objectively correct career.
- Replace career counselors, academic advisors, recruiters, or mentors.
- Rank a person's worth, intelligence, employability, or future success.
- Make employment, admissions, credit, insurance, or other high-impact eligibility decisions.
- Expose individual professional histories without explicit authorization.
- Infer protected characteristics or use them to narrow a user's opportunities.
- Encourage users to copy another person's career exactly.
- Present the historically most common path as the only valid path.
- Require a complete LinkedIn profile before providing value.
- Include live opportunity matching, precise salary comparison, or cost comparison in the first visualization MVP.
- Scrape or publish private posts, profiles, or application activity.

---

## 7. Target Audience

### 7.1 Primary Audience

- High school students who are old enough to use the platform and are beginning career exploration
- College and university students
- Community college students
- Trade school and certificate-program students
- Recent graduates with limited professional experience
- Gen Z users considering their first meaningful career direction
- First-generation students who may have limited access to professional networks

### 7.2 Secondary Audience

- Early-career professionals considering a pivot
- Students returning to school
- Career changers whose existing skills may transfer into a new field
- Advisors or mentors reviewing a student-generated path with permission

### 7.3 Initial Geographic Scope

The MVP should define one supported market and communicate it clearly. A reasonable initial assumption is the United States because school structures, role taxonomies, location filters, and opportunity systems vary significantly by country.

The data model must not hard-code United States-specific assumptions. Future releases should support:

- International education systems
- Work authorization constraints
- Country-specific job titles
- Regional salary and demand data
- Remote, hybrid, and in-person availability
- Multilingual content

---

## 8. Core Personas

### 8.1 The Undecided Student

**Example:** A second-year student who enjoys writing, psychology, and technology but cannot name a target career.

**Needs:**

- Broad but relevant career discovery
- Plain-language career previews
- Explanations connecting interests and skills to roles
- Reassurance that exploration does not require commitment
- Several different options, not a single recommendation

**Primary mode:** Explore

### 8.2 The Goal-Directed Student

**Example:** A computer science student who wants to become a product manager but does not know what experience to pursue first.

**Needs:**

- A route from current standing to a selected destination
- Intermediate roles and experiences
- Skill-gap explanations
- Alternative paths when direct entry is uncommon
- Evidence from aggregated professional histories

**Primary mode:** Build My Path

### 8.3 The Limited-Network Student

**Example:** A first-generation college student who has strong academic experience but few professional connections.

**Needs:**

- Exposure to careers outside their immediate network
- Examples of varied starting points
- Clear explanations of hidden intermediate steps
- Future recommendations for communities, alumni, mentors, and networking

**Primary mode:** Explore, followed by Build My Path

### 8.4 The Experience-Light Student

**Example:** A high school senior or first-year college student with no formal job history.

**Needs:**

- Recognition of coursework, clubs, projects, volunteering, hobbies, and informal responsibilities
- Recommendations that do not assume internships already exist
- Beginner-accessible next steps
- No empty or judgmental experience state

**Primary mode:** Explore

### 8.5 The Early Career Pivoter

**Example:** A recent graduate in an entry-level sales role who is considering marketing, customer success, or product operations.

**Needs:**

- Transferable skill analysis
- Adjacent roles and branch points
- A comparison between staying, specializing, and pivoting
- Recognition that the first job does not determine the whole career

**Primary mode:** Both

---

## 9. Jobs To Be Done

### 9.1 Functional Jobs

- When I do not know what career I want, help me discover options that make sense for me.
- When I find an interesting role, show me what people in that role actually do.
- When I choose a career, show me several ways I might reach it.
- When a path contains a role I do not understand, explain it in plain language.
- When I lack a required skill, show me where that skill fits into the path.
- When I cannot access one route, show me alternatives.
- When I see a recommendation, explain which parts of my profile influenced it.
- When I have very little experience, use my projects, coursework, clubs, and interests instead.
- When I return later, let me revisit and update my saved paths.

### 9.2 Emotional Jobs

- Help me feel less overwhelmed by career uncertainty.
- Help me see that I have useful starting assets.
- Help me explore without feeling locked into a decision.
- Help me believe that multiple routes can lead to a meaningful career.
- Help me distinguish a difficult path from an impossible one.

### 9.3 Social Jobs

- Help me explain my career interests to an advisor, mentor, parent, or peer.
- Help me ask better questions when speaking with professionals.
- Help me find people or communities relevant to a path in later versions.

---

## 10. Product Principles

### 10.1 Possibilities, Not Predictions

Use language such as "possible route," "commonly observed transition," and "may fit." Do not use language such as "you will become," "best career," or "guaranteed path."

### 10.2 Multiple Routes By Default

Do not present a single path unless the system explicitly states that data is limited. Show meaningful alternatives, including less common but plausible routes.

### 10.3 Explain Every Recommendation

A user must be able to understand why a destination or step appears. Explanations must refer to actual profile inputs and path evidence, not generic AI language.

### 10.4 Value More Than Paid Work

Projects, coursework, clubs, volunteering, caregiving, hobbies, certifications, competitions, and community activity can all demonstrate relevant skills.

### 10.5 Preserve User Agency

Users can edit inputs, hide fields, dismiss suggestions, pin preferred branches, choose destinations, and regenerate maps.

### 10.6 Evidence Without Surveillance

Use authorized, anonymized, aggregated historical patterns. Do not reveal individual histories or imply that the system monitored private behavior.

### 10.7 Historical Data Is Context, Not Truth

Observed career patterns may contain structural bias. The product must diversify routes and avoid treating historical exclusion as evidence that a user does not belong.

### 10.8 Clarity Before Density

The initial map should be understandable within seconds. Details should appear progressively rather than displaying every possible node at once.

### 10.9 Honest Uncertainty

Show when evidence is strong, limited, inferred, stale, or unavailable. Never invent precise confidence.

### 10.10 Actionable Exploration

Every completed exploration should leave the user with a clearer destination, a clearer question, or a plausible next step.

---

## 11. Terminology

| Term | Meaning |
| --- | --- |
| Current standing | The user's present combination of education, experience, skills, interests, and goals |
| Destination | A career or role the user may want to explore or reach |
| Step | A role, experience, skill milestone, education milestone, or activity that may advance a path |
| Path | An ordered set of connected steps between the current standing and a destination |
| Branch | An alternative continuation from a node |
| Transition | A directed relationship indicating that one step can plausibly lead to another |
| Career map | The complete visual graph shown to the user |
| Bubble | The visual representation of a graph node |
| Fit explanation | A plain-language explanation of why a role may align with the user |
| Similar cohort | A sufficiently large anonymous group with relevant shared starting characteristics |
| Historical pattern | An aggregated transition or path found in authorized career-history data |
| Career preview | A concise explanation of a role's responsibilities, environment, outputs, and common challenges |
| Evidence level | A qualitative indication of how much reliable support exists for a recommendation |
| Generated path | A personalized arrangement of evidence-supported nodes and transitions |

---

## 12. Product Structure

The initial product contains the following areas:

1. Entry and introduction
2. Consent and profile-data selection
3. Profile review and missing-input collection
4. Mode selection
5. Explore career map
6. Build My Path destination selection
7. Generated path map
8. Bubble detail panel
9. Similar-path evidence view
10. Save, edit, dismiss, and regenerate controls
11. Feedback and reporting

The product should allow movement between Explore and Build My Path without requiring the user to re-enter profile information.

---

## 13. End-to-End User Journey

### 13.1 Entry

The user can enter Path[IN] from:

- LinkedIn navigation
- A student or career dashboard
- Their profile
- A role page
- A learning or jobs experience in a later integration
- A direct prototype route during MVP development

The entry screen must immediately explain:

- What Path[IN] does
- What information it may use
- That paths are suggestions, not guarantees
- That the user controls which information is included

### 13.2 Consent and Data Selection

Before analysis, the user reviews selectable profile categories:

- Education
- Work experience
- Volunteer experience
- Projects
- Skills
- Interests
- Location
- Career goals
- School year or expected graduation

Each category has:

- An on/off control
- A short explanation of how it improves recommendations
- An edit option

The product must not silently analyze hidden, private, or unrelated data.

### 13.3 Profile Review

The user reviews imported data and can add missing information. A user with no LinkedIn profile history must still be able to continue through a lightweight form.

Minimum useful input:

- At least one interest, skill, subject, experience, or target role

Recommended input:

- Education stage
- Three or more skills or interests
- Location preference
- One project, activity, job, or course
- Career priorities

The product should explain that more context can improve relevance but should never block an experience-light user.

### 13.4 Goal and Preference Capture

Optional questions can include:

- Do you want to explore careers or reach a specific role?
- Which subjects or activities energize you?
- Which tasks do you dislike?
- Do you prefer working with people, information, systems, ideas, or physical objects?
- Do you prefer creative, analytical, helping, organizing, selling, building, or research-oriented work?
- Do you have a target industry?
- Are you open to additional education or certification?
- Do you prefer remote, hybrid, or in-person work?
- Are there geographic constraints?
- How soon do you want a next step?

These questions should be short, skippable, and written without requiring prior career knowledge.

### 13.5 Mode Selection

The user chooses:

- **Explore careers for me**
- **Build a path to a career**

The interface can recommend Explore for users without a target and Build My Path for users who enter a target.

### 13.6 Map Generation

During generation:

- Show a progress state with meaningful stages.
- Do not fake exact percentages.
- Examples of stages: "Understanding your starting point," "Finding relevant career families," and "Building possible routes."
- Allow cancellation.
- Preserve entered information if generation fails.

### 13.7 Map Exploration

The initial viewport shows:

- A clearly labeled current-standing node
- Three to five destination branches in Explore mode
- One destination and two to three route variants in Build My Path mode
- Only the most important intermediate nodes
- A visible legend
- A concise statement that the paths are possibilities

The user can:

- Select a node
- Expand or collapse a branch
- Follow a transition
- Compare alternate branches visually
- Pin a destination
- Dismiss an irrelevant node
- Ask why a node appears
- Regenerate unpinned portions
- Edit profile inputs
- Switch modes
- Save the map

### 13.8 Decision and Next Step

At the end of a session, the product should invite the user to:

- Save one or more paths
- Select a destination to investigate further
- Mark a suggestion as relevant or irrelevant
- Identify one next step
- Return after updating their profile

Future versions can convert that next step into a course, club, scholarship, connection, or job action.

---

## 14. Mode One: Explore

### 14.1 Purpose

Explore helps a user discover careers without requiring them to name a destination first.

### 14.2 Inputs

Explore can use:

- Education level and field
- Completed and current courses
- Projects
- Paid and unpaid experience
- Skills
- Interests
- Preferred activities
- Location and mobility preferences
- Work-style preferences
- Career priorities
- Roles or industries the user explicitly dislikes

### 14.3 Output

The first view should contain three to five diverse destination clusters. Each destination should include:

- Career title
- Career family
- One-sentence preview
- Top reasons it may fit
- Skills already demonstrated
- Important skills to develop
- At least one plausible route from the current standing
- Alternative adjacent destinations
- Evidence level

### 14.4 Recommendation Diversity

The result set should not consist only of near-duplicate titles. It should balance:

- Strong direct matches
- Adjacent possibilities
- One or more discovery-oriented options
- Different industries when the user's skills transfer
- Different education or experience requirements

The system should avoid novelty for novelty's sake. Every destination still needs a defensible explanation.

### 14.5 Explore Interactions

The user can:

- Expand one destination into a detailed route
- Hide a destination
- Request "more like this"
- Request "show me something different"
- Add a destination to Build My Path
- Search for a destination not shown
- Change the importance of a preference
- View the evidence behind a recommendation

---

## 15. Mode Two: Build My Path

### 15.1 Purpose

Build My Path helps a user who has a destination understand several plausible routes from their current standing.

### 15.2 Destination Selection

The user can:

- Search for a role
- Select a destination discovered in Explore
- Choose from recently viewed roles
- Enter a plain-language aspiration such as "work in climate technology"

If the target is broad, the system asks a limited clarifying question or generates several sub-destinations.

### 15.3 Route Generation

The output should normally show:

- The current standing
- Two to three distinct route variants
- Intermediate roles or experiences
- Skills that bridge steps
- The destination
- Alternative branch points

Possible route labels include:

- Most commonly observed
- Project-first
- Internship-first
- Adjacent-role route
- Education or certification route
- Transferable-skills route

Labels must describe the route, not claim it is objectively best.

### 15.4 Route Editing

The user can:

- Remove a step they do not want
- Lock a required or preferred step
- Ask for an alternative to a step
- Add a role or experience manually
- Regenerate the remaining route
- Change location or education constraints
- Return to Explore

### 15.5 Destination Feasibility

The system must never label a goal "impossible." If reliable evidence is sparse or the transition is highly indirect, say:

- "This route has limited historical evidence in the available data."
- "People reach this destination through varied routes."
- "Additional experience may strengthen this transition."

Then provide:

- Adjacent stepping-stone roles
- Skills that could improve readiness
- Alternative evidence-building experiences
- A way to proceed with exploration

---

## 16. Career Map Model

### 16.1 Node Types

The graph may contain these node types:

| Node type | Purpose | MVP |
| --- | --- | --- |
| Current standing | Summarizes the user's starting point | Required |
| Destination role | Represents a potential career outcome | Required |
| Intermediate role | Represents a job between the start and destination | Required |
| Entry-level role | Represents an accessible early professional role | Required |
| Experience | Represents an internship, project, volunteering, club, or activity | Required |
| Skill milestone | Represents a meaningful skill or skill cluster | Optional in initial map, required in details |
| Education milestone | Represents a degree, course category, or certification | Optional |
| Similar-path cohort | Represents aggregated historical evidence | Required in detail view |
| Resource | Represents a course, scholarship, club, event, or job | Later |
| Decision point | Represents a meaningful branch or route choice | Optional |
| Accomplishment | Represents evidence such as a portfolio, certification, or result | Later |

### 16.2 Edge Types

| Edge type | Meaning |
| --- | --- |
| Observed transition | An aggregated transition seen in historical career data |
| Recommended transition | A plausible transition created from profile fit and graph evidence |
| Skill bridge | A skill or skill cluster connects two steps |
| Prerequisite | A step is commonly required before another step |
| Helpful preparation | A step may help but is not required |
| Alternative | A branch can substitute for another route |
| Adjacent role | Two roles have meaningfully overlapping skills or responsibilities |
| Leads to destination | A final transition into the selected destination |

### 16.3 Edge Semantics

An edge means "this can plausibly contribute to or precede that step." It does not mean:

- The transition is guaranteed
- The prior node is mandatory
- Every person follows the direction shown
- The transition has equal availability in every location

The interface should provide an edge explanation such as:

> "This transition appears because product analysts and junior product managers share several core skills, and the transition occurs in the available aggregated histories."

### 16.4 Path Properties

Each generated path should store:

- Start node
- Destination node
- Ordered intermediate nodes
- Alternative branches
- Fit reasons
- Evidence references
- Cohort size or evidence sufficiency category
- Confidence category
- Data version
- Model version
- Generation timestamp
- User constraints

---

## 17. Visual and Interaction Requirements

### 17.1 Visual Hierarchy

The map should make these elements immediately distinguishable:

- The user's current standing
- Career destinations
- Intermediate roles
- Experiences or activities
- Skills
- Alternative branches
- Evidence-backed versus speculative transitions

Do not rely on color alone. Use combinations of:

- Shape
- Border style
- Icon
- Label
- Color
- Edge pattern

### 17.2 Suggested Visual Encoding

| Element | Suggested treatment |
| --- | --- |
| Current standing | Prominent filled circle with "You are here" label |
| Destination | Larger rounded rectangle or circle with destination icon |
| Role | Medium circle or rounded rectangle |
| Experience | Hexagon or distinct activity icon |
| Skill | Small pill or compact node |
| Common transition | Solid line |
| Alternative route | Dashed line |
| Lower-evidence route | Dotted line plus text label |
| Selected path | Stronger contrast and thicker edge |
| Collapsed branch | Count badge such as "+3 alternatives" |

These are design hypotheses, not fixed brand decisions.

### 17.3 Layout Rules

- The map should read from current standing toward destination.
- A left-to-right layout is preferred on desktop because it allows route comparison.
- A top-to-bottom layout is acceptable on narrow screens.
- Branches must not overlap labels.
- Important routes should appear before secondary branches.
- The system should cap visible complexity and use progressive expansion.
- The same node should not be duplicated without a clear reason.
- When paths reconverge, the layout should make convergence understandable.
- The viewport should automatically fit the initial result.
- The user's position and selected destination should remain orienting anchors.

### 17.4 Core Controls

- Pan
- Zoom in and out
- Fit map to screen
- Reset view
- Move backward toward the current standing
- Move forward toward a destination
- Move to the previous connected node
- Move to the next connected node
- Expand branch
- Collapse branch
- Select node
- Open node details
- Pin node or path
- Dismiss node
- Undo dismissal
- Regenerate
- Search destination
- Switch mode
- Edit profile
- Save path
- Open legend

### 17.5 Interaction Behavior

- Every visible current-standing, skill, experience, role, and destination node must be clickable, tappable, and keyboard focusable.
- Selecting a node opens that node's own detail view without navigating away from or resetting the map.
- Selecting a node highlights directly related incoming and outgoing paths.
- Unrelated nodes become visually quieter but remain available.
- Selecting an edge explains the transition.
- From any selected node, the user can move backward through predecessor nodes toward their current standing or forward through successor nodes toward a destination.
- If a node has multiple previous or next connections, the interface shows a branch chooser instead of selecting a route silently.
- Returning to a previously visited node restores its prior expansion and scroll state.
- Expanding a node preserves the user's viewport and context.
- Regeneration must preserve pinned nodes.
- Dismissal should ask for optional feedback but not require it.
- Every destructive-looking action must be undoable during the session.
- The browser Back action must not erase the map unexpectedly.
- A shareable view must not expose private profile inputs by default.

### 17.6 Bidirectional Path Traversal

"Up" and "down" describe progression through the career path, not only a fixed screen direction:

- **Backward or upstream:** Move from a destination or later role back through earlier positions, experiences, skills, and the user's current standing.
- **Forward or downstream:** Move from the current standing or an intermediate node toward later positions and destinations.

The user must be able to:

- Start at any bubble and follow its path in either direction.
- Click consecutive bubbles without closing and reopening the map.
- Use visible Previous and Next controls in the node detail panel.
- Click a connected previous or next node directly from the "How This Connects" section.
- Return to the exact node and viewport they came from.
- Pan the canvas vertically and horizontally when the map extends beyond the viewport.
- Follow a highlighted path while other branches remain available.
- Choose a branch whenever more than one previous or next node exists.
- See a persistent orientation cue identifying "Your current standing" and the selected destination.

Direction controls must adapt to layout:

- In a top-to-bottom map, Up moves toward earlier steps and Down moves toward later steps.
- In a left-to-right map, Left moves toward earlier steps and Right moves toward later steps.
- The interface must also use the explicit labels Previous and Next so meaning never depends on spatial orientation alone.

Keyboard behavior:

- `Enter` or `Space` opens the focused node.
- Arrow keys move between connected nodes in the visual direction of the map.
- `Shift+Arrow` may move between sibling branches when more than one connection exists.
- `Escape` closes the detail panel and returns focus to the originating node.
- The interface announces the selected node, its type, its position in the route, and the number of previous and next connections.

### 17.7 Mobile Behavior

The visualization must remain usable on mobile:

- Use vertical progression by default.
- Show one primary route at a time.
- Place alternatives in expandable trays.
- Open details in a bottom sheet.
- Keep Previous and Next node controls visible in the bottom sheet.
- Allow vertical scrolling through a route and direct tapping of every visible bubble.
- Provide large touch targets.
- Avoid requiring hover.
- Preserve zoom and pan alternatives for keyboard and screen-reader users.

### 17.8 Reduced Motion

When reduced motion is enabled:

- Do not animate the full graph rearrangement.
- Use short fades or immediate placement.
- Do not use motion as the only signal of a changed route.

---

## 18. Bubble Detail Requirements

Selecting any current-standing, skill, experience, role, or destination bubble should open a detail panel for that specific node. The panel must identify the selected node and contain the applicable sections below.

The panel must also provide:

- Previous-node and next-node controls
- A branch chooser when multiple previous or next nodes exist
- Direct links to connected nodes
- A position indicator such as "Step 2 of 5 on this route"
- Section navigation for Summary, Why It May Fit, What The Work Involves, Skills, How This Connects, Similar Historical Patterns, and Career Preview
- Scrolling through all applicable sections without closing the panel
- A return-to-map control that restores focus and viewport position

### 18.1 Summary

- Role title
- Career family
- Seniority or stage
- One-sentence explanation
- Typical work setting

### 18.2 Why It May Fit

- Profile attributes that influenced the recommendation
- Relevant interests
- Existing skills
- Related education or experience
- User preferences that align
- A clear note if the explanation is based on limited data

Example:

> "This role may fit because your research project, communication experience, interest in technology, and preference for collaborative work overlap with common product research responsibilities."

### 18.3 What The Work Involves

- Typical responsibilities
- Common outputs or deliverables
- People or teams the role works with
- Common tools or methods
- Examples of a normal project
- Common challenges

### 18.4 Skills

- Skills the user appears to have
- Transferable skills
- Skills commonly associated with the role
- Skills that may need development
- Evidence from the user's profile

### 18.5 How This Connects

- Previous plausible steps
- Next plausible steps
- Why each transition exists
- Alternative branches
- Whether the step is required, common, or simply helpful

### 18.6 Similar Historical Patterns

- Number or range of profiles represented
- Common starting points
- Common previous roles or experiences
- Common next roles
- A statement that these are aggregate patterns
- Evidence quality or sufficiency

### 18.7 Career Preview

- A short "day in the work" preview
- Tasks the user may enjoy
- Tasks the user may not enjoy
- Environment and collaboration style
- A prompt encouraging independent validation through informational interviews or other sources

### 18.8 Future Detail Sections

- Salary range
- Hiring demand
- Estimated time to transition
- Estimated education or credential cost
- Courses
- Scholarships
- Clubs
- Portfolio projects
- Entry-level openings
- Networking opportunities
- Professionals open to mentoring
- Posts describing how people entered the field

These future sections should not appear as empty promises in the MVP. They can be omitted or clearly labeled as planned.

---

## 19. Current Standing

The current-standing node must not reduce the user to a single job title. It should summarize:

- Education stage
- Field or subjects
- Current and past experiences
- Projects and activities
- Skill clusters
- Interests
- Location preference
- Stated goals
- Constraints the user chose to provide

The user can open this node to:

- Review what the system used
- Correct incorrect information
- Hide a field
- Add missing context
- Regenerate the map

The current-standing summary should avoid deficit language. For example:

- Prefer: "No formal work experience added yet"
- Avoid: "You lack experience"

---

## 20. Profile Inputs

### 20.1 Supported Inputs

| Category | Examples |
| --- | --- |
| Education | School, degree, major, concentration, graduation year |
| Coursework | Relevant courses, subject areas, capstones |
| Work | Jobs, internships, apprenticeships, freelance work |
| Projects | Class projects, personal projects, portfolios, research |
| Activities | Clubs, sports, competitions, student government |
| Volunteer work | Community service, nonprofit work, peer support |
| Skills | Technical, creative, analytical, interpersonal, language |
| Interests | Topics, industries, problems, communities |
| Preferences | Work style, environment, collaboration, schedule |
| Location | Current area, preferred area, remote preference |
| Goals | Desired role, industry, impact, timeline |
| Constraints | Education willingness, mobility, time, accessibility needs |

### 20.2 Input Provenance

Every field should record where it came from:

- Imported profile
- User-entered
- User-confirmed
- Inferred
- Generated

Inferred information should be clearly distinguishable and editable.

### 20.3 Excluded Inputs

The recommendation engine must not use protected or highly sensitive data to reduce opportunity, including:

- Race or ethnicity
- Religion
- Disability status
- Sexual orientation
- Gender identity
- Pregnancy
- Genetic information
- Health information
- Political affiliation
- Precise home address

Legal and privacy review must determine whether any demographic information can be used solely for fairness evaluation. Such data must remain separated from recommendation generation.

---

## 21. Real Career-History Evidence

### 21.1 Purpose

Real career histories help answer:

- Which roles commonly follow one another?
- Which starting backgrounds have led to a destination?
- Which transitions occur across industries?
- Where do paths tend to branch or converge?
- Which skills appear across successful transitions?

### 21.2 Data Authorization

Before using any dataset, the team must confirm:

- The data was collected lawfully.
- The intended use permits career-path analysis.
- User consent and platform terms permit the use.
- Retention and deletion obligations are understood.
- The data does not include private or improperly scraped content.
- The team has documented data provenance.

Having access to data is not, by itself, permission to use it.

### 21.3 Aggregation

The user interface must show aggregate patterns, not individual timelines.

Recommended initial policy:

- Use a configurable minimum cohort threshold.
- Start with a conservative threshold such as 20 profiles.
- Suppress or generalize results below the threshold.
- Do not show exact combinations that could re-identify a person.
- Round or bucket counts where appropriate.
- Do not display names, photos, employers, schools, dates, or unique text from source histories in the aggregate evidence view.

The final threshold requires privacy review and depends on the dataset.

### 21.4 Similarity Dimensions

Similarity may consider:

- Education stage
- Broad field of study
- Skill clusters
- Types of experience
- Starting role family
- Broad geography
- Career interests
- Experience level

Similarity must not consider protected traits. The system must be cautious with proxy variables such as school, ZIP code, and organization membership.

### 21.5 Similarity Presentation

Avoid:

> "People exactly like you became product managers."

Prefer:

> "In the available data, people with overlapping education, skills, and early experience followed several routes toward product management."

### 21.6 Path Clustering

Historical timelines should be normalized and grouped into path patterns:

1. Normalize titles into role families.
2. Order experiences by time.
3. Identify transitions.
4. Remove obvious data errors and duplicate records.
5. Group similar transition sequences.
6. Measure frequency, recency, and variation.
7. Suppress insufficient cohorts.
8. Preserve less common but plausible routes where privacy permits.

### 21.7 Sparse Evidence

When there is insufficient historical evidence:

- Do not fabricate a cohort.
- Use adjacent-role and skill-overlap evidence if available.
- Label the route as inferred.
- Explain that the dataset has limited coverage.
- Offer broader destinations or nearby role families.

### 21.8 Posts and Narrative Evidence

A future version may use public, authorized professional posts to explain how roles were obtained. Requirements:

- Never imply that a post proves causation.
- Summarize rather than reproduce substantial text.
- Respect content rights and deletion.
- Do not expose a person in an anonymized cohort through a distinctive story.
- Separate first-person anecdotes from aggregate evidence.
- Label anecdotes as individual experiences, not universal instructions.

---

## 22. Recommendation System

### 22.1 High-Level Pipeline

1. Collect user-authorized profile inputs.
2. Normalize titles, skills, education, interests, and locations.
3. Create a structured current-standing representation.
4. Generate candidate career families and destinations.
5. Filter candidates that conflict with explicit user constraints.
6. Score candidates across multiple fit dimensions.
7. Retrieve historical transition evidence.
8. Build several plausible route graphs.
9. Diversify destinations and routes.
10. Generate grounded explanations.
11. Validate graph integrity and safety rules.
12. Return a versioned structured response to the frontend.

### 22.2 Fit Dimensions

A destination fit assessment can consider:

- Skill overlap
- Transferable skill overlap
- Interest alignment
- Task preference alignment
- Education relevance
- Experience relevance
- Location compatibility
- Entry accessibility
- Goal alignment
- Historical transition support
- User exclusions

The user does not need to see a single numeric score. A precise number can imply certainty the system does not possess. Prefer clear factors such as:

- Strong skill overlap
- Moderate interest alignment
- Additional preparation likely
- Limited historical evidence

### 22.3 Candidate Generation

Candidates should come from a maintained career taxonomy and evidence graph, not unconstrained text generation alone.

Candidate sources can include:

- Skill-to-role relationships
- Interest-to-career-family relationships
- Education-to-role patterns
- Historical transitions
- Adjacent-role similarity
- User-entered aspirations

### 22.4 Path Generation

Path generation should behave as a constrained graph problem:

- Start at the user's normalized current standing.
- End at one or more destination roles.
- Prefer paths with explainable transitions.
- Limit path length for readability.
- Avoid cycles unless intentionally showing a pivot.
- Penalize redundant steps.
- Respect user constraints.
- Include alternative routes with meaningfully different strategies.
- Preserve evidence metadata on every transition.

### 22.5 Role of Generative AI

Generative AI can:

- Translate structured evidence into plain-language explanations.
- Summarize role responsibilities.
- Explain transferable skills.
- Produce concise career previews from approved source material.
- Convert broad aspirations into candidate role families.

Generative AI must not:

- Invent historical transitions.
- Invent cohort sizes.
- Invent salaries, demand, requirements, or credentials.
- Claim access to private profiles.
- create a path unsupported by the structured graph without labeling it as inferred.
- Make deterministic statements about a user's future.

### 22.6 Explanation Grounding

Every explanation should be traceable to:

- User-provided profile fields
- A maintained role or skill taxonomy
- Aggregated historical transition data
- An approved career-information source

If an explanation cannot be grounded, it should not be shown.

### 22.7 Route Diversity

The route generator should avoid returning three cosmetic variations of the same route. Diversity can be measured across:

- Intermediate role families
- Experience type
- Education requirements
- Industry
- Time horizon
- Skill-building strategy

### 22.8 Feedback Loop

User feedback can include:

- This fits me
- This does not fit me
- I already completed this
- I am not interested in this industry
- This explanation is unclear
- This path seems unrealistic
- I want more routes like this

Feedback should modify the current experience where possible and be stored according to consent and retention policy.

---

## 23. Functional Requirements

Priority definitions:

- **P0:** Required for the visualization MVP
- **P1:** Important next capability
- **P2:** Later expansion

### 23.1 Entry, Profile, and Consent

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-001 | P0 | Explain the product purpose before analysis begins. |
| FR-002 | P0 | State that generated paths are possibilities, not guarantees. |
| FR-003 | P0 | Let the user select which profile categories may be analyzed. |
| FR-004 | P0 | Let the user review and edit imported profile information. |
| FR-005 | P0 | Support manual onboarding when imported profile data is unavailable. |
| FR-006 | P0 | Let the user enter skills, interests, education, experience, location preferences, and goals. |
| FR-007 | P0 | Allow an experience-light user to continue without formal work history. |
| FR-008 | P0 | Record whether each input was imported, entered, confirmed, inferred, or generated. |
| FR-009 | P0 | Let the user hide an input and regenerate results. |
| FR-010 | P1 | Import a LinkedIn profile with explicit permission. |

### 23.2 Explore

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-011 | P0 | Generate three to five career destinations from a user's profile. |
| FR-012 | P0 | Include at least one defensible explanation for every destination. |
| FR-013 | P0 | Show destination diversity rather than duplicate job titles. |
| FR-014 | P0 | Let the user expand a destination into intermediate steps. |
| FR-015 | P0 | Let the user dismiss a destination. |
| FR-016 | P0 | Let the user request more options or different options. |
| FR-017 | P0 | Let the user move a destination into Build My Path. |
| FR-018 | P1 | Let the user adjust the importance of interests and work preferences. |
| FR-019 | P1 | Let the user filter by broad industry or location. |

### 23.3 Build My Path

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-020 | P0 | Let the user search for and select a career destination. |
| FR-021 | P0 | Generate at least two meaningfully distinct routes when evidence permits. |
| FR-022 | P0 | Connect the current standing, intermediate steps, and destination. |
| FR-023 | P0 | Explain every transition in the generated path. |
| FR-024 | P0 | Let the user remove an unwanted step. |
| FR-025 | P0 | Let the user request an alternative to a step. |
| FR-026 | P0 | Preserve pinned nodes during regeneration. |
| FR-027 | P1 | Let the user manually add a preferred experience or role. |
| FR-028 | P1 | Let the user apply constraints such as location or willingness to pursue more education. |

### 23.4 Visualization

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-029 | P0 | Render the current standing as a distinct node. |
| FR-030 | P0 | Render destination, role, and experience nodes distinctly. |
| FR-031 | P0 | Render primary and alternative transitions distinctly. |
| FR-032 | P0 | Support node selection and a detail panel. |
| FR-033 | P0 | Support branch expansion and collapse. |
| FR-034 | P0 | Support pan, zoom, fit, and reset controls. |
| FR-035 | P0 | Highlight a selected node's connected transitions. |
| FR-036 | P0 | Provide a visible legend. |
| FR-037 | P0 | Keep the initial map below a defined visual-complexity limit. |
| FR-038 | P0 | Support keyboard navigation for map content. |
| FR-039 | P0 | Provide a non-visual structured path representation. |
| FR-040 | P1 | Support direct comparison of route branches in one view. |

### 23.5 Details and Explanations

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-041 | P0 | Show why a role may fit the user. |
| FR-042 | P0 | Show typical responsibilities in plain language. |
| FR-043 | P0 | Show existing, transferable, and commonly needed skills. |
| FR-044 | P0 | Explain how the selected node connects to adjacent nodes. |
| FR-045 | P0 | Indicate whether evidence is historical, taxonomy-based, or inferred. |
| FR-046 | P0 | Show aggregate similar-path evidence when the privacy threshold is met. |
| FR-047 | P0 | Show an honest insufficient-data state when the threshold is not met. |
| FR-048 | P1 | Show richer career previews with example work. |
| FR-049 | P1 | Show common challenges and work-environment characteristics. |

### 23.6 Saving and Feedback

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-050 | P0 | Let the user save a generated map. |
| FR-051 | P0 | Let the user reopen a saved map. |
| FR-052 | P0 | Store the profile snapshot and model/data version used for a saved map. |
| FR-053 | P0 | Let the user mark recommendations relevant or irrelevant. |
| FR-054 | P0 | Let the user report an incorrect, unsafe, or biased recommendation. |
| FR-055 | P1 | Let the user name and organize multiple saved paths. |
| FR-056 | P1 | Let the user share a privacy-preserving path view. |

### 23.7 Future Action Layer

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-057 | P1 | Recommend skills to learn for a selected transition. |
| FR-058 | P1 | Recommend relevant projects, courses, or certifications. |
| FR-059 | P1 | Recommend scholarships after filtering prior applications and eligibility. |
| FR-060 | P1 | Recommend school-year-appropriate opportunities. |
| FR-061 | P1 | Recommend clubs available at the user's school or in their area. |
| FR-062 | P1 | Recommend entry-level roles and internships. |
| FR-063 | P1 | Recommend networking opportunities and relevant communities. |
| FR-064 | P2 | Compare paths by estimated time. |
| FR-065 | P2 | Compare paths by estimated financial cost. |
| FR-066 | P2 | Compare paths by salary and hiring demand. |
| FR-067 | P2 | Incorporate application history to avoid duplicate suggestions. |
| FR-068 | P2 | Use authorized public narratives to illustrate how positions were obtained. |

### 23.8 Bidirectional Node Navigation

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-069 | P0 | Make every visible current-standing, skill, experience, role, and destination node selectable by pointer, touch, and keyboard. |
| FR-070 | P0 | Let the user traverse from any node backward toward the current standing and forward toward a destination. |
| FR-071 | P0 | Provide Previous, Next, and branch-selection controls without resetting map state. |
| FR-072 | P0 | Let the user pan vertically and horizontally through maps larger than the viewport. |
| FR-073 | P0 | Provide navigable sections within each node's detail view and preserve the user's position when moving between nodes. |

---

## 24. Data Model

### 24.1 Core Entities

#### UserProfile

- `id`
- `education[]`
- `coursework[]`
- `experience[]`
- `projects[]`
- `activities[]`
- `volunteering[]`
- `skills[]`
- `interests[]`
- `preferences`
- `locationPreferences`
- `goals[]`
- `constraints`
- `consent`
- `fieldProvenance`
- `createdAt`
- `updatedAt`

#### CareerRole

- `id`
- `canonicalTitle`
- `aliases[]`
- `careerFamily`
- `industryTags[]`
- `seniority`
- `description`
- `responsibilities[]`
- `skillIds[]`
- `educationPatterns[]`
- `workEnvironment`
- `sourceReferences[]`
- `taxonomyVersion`

#### CareerStep

- `id`
- `type`
- `roleId`
- `label`
- `summary`
- `userFitReasons[]`
- `existingSkillIds[]`
- `transferableSkillIds[]`
- `skillGapIds[]`
- `evidence`
- `metadata`

#### CareerTransition

- `id`
- `sourceNodeId`
- `targetNodeId`
- `transitionType`
- `historicalFrequencyBucket`
- `cohortSizeBucket`
- `recency`
- `evidenceLevel`
- `requiredSkillIds[]`
- `explanation`
- `sourceDataVersion`

#### CareerMap

- `id`
- `userId`
- `mode`
- `profileSnapshot`
- `destinationIds[]`
- `nodes[]`
- `edges[]`
- `pinnedNodeIds[]`
- `dismissedNodeIds[]`
- `generationConstraints`
- `dataVersion`
- `modelVersion`
- `promptVersion`
- `createdAt`
- `updatedAt`

#### SimilarCohort

- `id`
- `matchingDimensions[]`
- `cohortSizeBucket`
- `commonStartingPoints[]`
- `commonTransitions[]`
- `commonDestinations[]`
- `privacyStatus`
- `dataVersion`

### 24.2 Example Career Map Response

```json
{
  "id": "map_123",
  "mode": "build",
  "disclaimer": "These are possible routes, not guaranteed outcomes.",
  "profileSnapshot": {
    "educationStage": "college_sophomore",
    "fields": ["psychology"],
    "skills": ["research", "writing", "presentation"],
    "interests": ["technology", "human_behavior"],
    "locationPreferences": ["remote", "california"]
  },
  "nodes": [
    {
      "id": "current",
      "type": "current_standing",
      "label": "Your current standing"
    },
    {
      "id": "project",
      "type": "experience",
      "label": "User research project",
      "fitReasons": [
        "Builds on your psychology coursework",
        "Creates evidence of interview and synthesis skills"
      ]
    },
    {
      "id": "intern",
      "type": "entry_role",
      "label": "UX research intern"
    },
    {
      "id": "destination",
      "type": "destination_role",
      "label": "UX researcher"
    }
  ],
  "edges": [
    {
      "source": "current",
      "target": "project",
      "type": "recommended_transition",
      "evidenceLevel": "moderate",
      "explanation": "A research project can turn your existing coursework into a portfolio example."
    },
    {
      "source": "project",
      "target": "intern",
      "type": "skill_bridge",
      "evidenceLevel": "moderate",
      "explanation": "Both steps use interviewing, analysis, and presentation skills."
    },
    {
      "source": "intern",
      "target": "destination",
      "type": "observed_transition",
      "evidenceLevel": "strong",
      "cohortSizeBucket": "100_plus",
      "explanation": "This transition appears frequently in the available aggregated histories."
    }
  ],
  "generation": {
    "dataVersion": "career_graph_2026_06",
    "modelVersion": "path_ranker_0_1",
    "generatedAt": "2026-06-23T21:00:00Z"
  }
}
```

### 24.3 Data Versioning

Every saved map must retain:

- Career taxonomy version
- Historical dataset version
- Ranking model version
- Explanation prompt version
- Generation date

This allows the team to investigate why a path changed and reproduce prior outputs when required.

---

## 25. Backend API Requirements

The API should use versioned JSON endpoints.

### 25.1 Health

`GET /api/v1/health`

Returns service health and non-sensitive version information.

### 25.2 Normalize Profile

`POST /api/v1/profiles/normalize`

Purpose:

- Validate input
- Normalize titles, skills, and education
- Return editable inferred fields

### 25.3 Explore Map

`POST /api/v1/maps/explore`

Input:

- Authorized profile
- User preferences
- Excluded roles or industries
- Optional pinned destinations

Output:

- Three to five destination branches
- Nodes and edges
- Fit explanations
- Evidence metadata
- Warnings and insufficiency states

### 25.4 Build Map

`POST /api/v1/maps/build`

Input:

- Authorized profile
- Destination
- Constraints
- Pinned or dismissed steps

Output:

- Two to three route variants when evidence permits
- Nodes and edges
- Transition explanations
- Evidence metadata

### 25.5 Retrieve Map

`GET /api/v1/maps/{map_id}`

Authorization must ensure that only the owner or an explicitly authorized viewer can access the private map.

### 25.6 Update Map

`PATCH /api/v1/maps/{map_id}`

Supported updates:

- Pin node
- Dismiss node
- Rename map
- Save viewport preferences

### 25.7 Regenerate Map

`POST /api/v1/maps/{map_id}/regenerate`

Must preserve requested pinned nodes and apply current profile changes.

### 25.8 Feedback

`POST /api/v1/maps/{map_id}/feedback`

Feedback payload should support:

- Target node or edge
- Feedback category
- Optional user comment
- Safety or bias flag

### 25.9 Role Details

`GET /api/v1/roles/{role_id}`

Returns structured role details and approved source metadata.

### 25.10 API Error Contract

Errors should use a consistent shape:

```json
{
  "error": {
    "code": "INSUFFICIENT_EVIDENCE",
    "message": "There is not enough aggregate data to show this route safely.",
    "retryable": false,
    "details": {}
  }
}
```

The API must not expose stack traces, source records, internal prompts, or sensitive identifiers.

---

## 26. Technical Architecture

### 26.1 Repository Shape

```text
PathIn/
  frontend/
    app/
    components/
    features/
      profile/
      career-map/
      role-details/
      feedback/
    lib/
    public/
    tests/
  backend/
    app/
      api/
      models/
      schemas/
      services/
      repositories/
      recommendation/
      privacy/
    tests/
  data/
    README.md
    schemas/
  docs/
    PRODUCT_REQUIREMENTS.md
  .env.example
  README.md
```

Raw private datasets must not be committed to Git.

### 26.2 Frontend

Recommended responsibilities:

- Next.js with TypeScript
- App Router
- Server-rendered entry and informational views where useful
- Client-rendered interactive career map
- Accessible graph and list representations
- Typed API client
- Profile forms and validation
- Loading, error, and empty states
- Responsive details panel
- Analytics event instrumentation

The graph renderer should be selected through a short prototype comparing:

- Accessibility support
- Custom node and edge rendering
- Automatic layout compatibility
- Mobile performance
- Keyboard interaction
- Branch expansion behavior

### 26.3 Backend

Recommended responsibilities:

- Flask application factory
- Versioned REST API
- Request and response validation
- Authentication and authorization boundary
- Profile normalization
- Career taxonomy access
- Historical graph retrieval
- Candidate ranking
- Path generation
- Explanation grounding
- Privacy-threshold enforcement
- Feedback collection
- Audit logging

### 26.4 Data Layer

Potential components:

- Relational database for users, profiles, maps, feedback, and versions
- Graph-oriented structures for path generation
- Object storage for approved offline artifacts
- Cache for repeated role and taxonomy lookups

A dedicated graph database is not required for the MVP. A normalized relational model or versioned in-memory graph artifact may be sufficient until scale and query patterns justify another system.

### 26.5 AI Boundary

The Flask service should orchestrate AI calls behind a dedicated interface. The frontend must never call a model provider directly with private profile data.

The AI service interface should:

- Accept structured, minimized inputs
- Return schema-validated output
- Include source and evidence identifiers
- Enforce timeouts and retry limits
- Record model and prompt version
- Avoid storing raw prompts containing unnecessary personal data

### 26.6 Local Development Requirements

- Node.js 20 or newer for the current Next.js toolchain
- Python 3.10 or newer
- Isolated Python environment
- Environment variables documented in `.env.example`
- One command per service and an optional combined development command
- Seed or synthetic data for local development

At the time this document was created, the local machine had Node.js 18.16.1, so Node must be upgraded before using the current Next.js release.

### 26.7 Deployment Shape

Initial deployment can use:

- Independently deployed frontend and backend
- HTTPS-only API communication
- Restricted CORS configuration
- Environment-specific secrets
- Managed relational database
- Centralized logs and metrics

The frontend can proxy browser API calls through a same-origin route if that simplifies authentication and avoids broad CORS access.

---

## 27. Data Processing Pipeline

### 27.1 Offline Ingestion

1. Register dataset source and authorization.
2. Validate schema.
3. Remove disallowed fields.
4. Normalize role titles.
5. Normalize employers and schools only as needed for aggregate analysis.
6. Normalize skill terms.
7. Resolve dates into ordered sequences.
8. Detect duplicates and contradictory timelines.
9. Map roles to career families and seniority.
10. Generate transitions.
11. Aggregate transitions into privacy-safe cohorts.
12. Measure coverage and bias.
13. Version the output artifact.
14. Publish only approved aggregate artifacts to the application environment.

### 27.2 Title Normalization

The system should handle:

- Abbreviations
- Seniority words
- Company-specific titles
- Equivalent titles across industries
- Intern, apprentice, contractor, and volunteer distinctions
- Multi-role positions
- International variations

Raw titles should not be discarded. Preserve them in secured source processing for audit, while application logic uses canonical role identifiers.

### 27.3 Transition Quality Checks

Reject or flag transitions when:

- Dates are impossible
- Roles overlap in a way the model cannot interpret
- A title cannot be normalized reliably
- The record is duplicated
- The source is unauthorized
- The cohort is below the privacy threshold
- The transition is dominated by one identifiable organization or school

### 27.4 Recency

Career transitions change over time. Store the observation period and consider recency without deleting historically valid routes. The UI can say:

- Common in recent data
- Observed across multiple time periods
- Limited recent evidence

---

## 28. Privacy Requirements

### 28.1 Consent

- Consent must be explicit and understandable.
- Optional fields must remain optional.
- Users must be able to withdraw consent.
- Withdrawing consent must stop future analysis of excluded data.
- The user must be told whether data is saved and for how long.

### 28.2 Data Minimization

- Send only required fields to each service.
- Do not include names when generating paths.
- Do not include exact addresses.
- Do not include private messages.
- Do not include unrelated post content.
- Avoid logging raw profile payloads.

### 28.3 User Control

Users must be able to:

- View analyzed fields
- Correct fields
- Remove fields
- Delete saved maps
- Delete Path[IN]-specific profile data
- Export saved paths where required
- Disable personalization

### 28.4 Similar-Cohort Privacy

- Enforce aggregation thresholds in the backend, not only the UI.
- Suppress small groups.
- Generalize rare attributes.
- Prevent repeated queries from reconstructing a cohort.
- Rate-limit exploratory cohort queries.
- Audit outputs for re-identification risk.

### 28.5 Security

- Encrypt data in transit.
- Encrypt sensitive data at rest.
- Use least-privilege service access.
- Separate development, testing, and production data.
- Never place production profile data in local seed files.
- Rotate credentials.
- Validate all user input.
- Protect against prompt injection in imported text.
- Maintain dependency and vulnerability scanning.

### 28.6 Minors

Because some students may be under 18:

- Confirm applicable platform age requirements.
- Obtain specialized legal and privacy review.
- Avoid unnecessary sensitive-data collection.
- Provide age-appropriate explanations.
- Do not target manipulative engagement patterns at minors.
- Define whether the initial release excludes users below a chosen age.

---

## 29. Fairness and Bias Requirements

### 29.1 Core Risk

Historical career data reflects unequal access to education, networks, hiring, promotion, and compensation. A system trained only to reproduce common historical paths can reinforce those inequalities.

### 29.2 Safeguards

- Do not use protected characteristics for recommendation ranking.
- Audit proxy variables.
- Include skill-based and adjacent-role routes, not only historically common routes.
- Diversify destination recommendations.
- Avoid lowering ambition based on school prestige, geography, or limited prior opportunity.
- Avoid prestige-only ranking.
- Show less common but plausible routes when evidence and privacy allow.
- Let users request broader or more ambitious alternatives.
- Never infer that underrepresentation means poor fit.
- Review explanation language for stereotypes.

### 29.3 Evaluation

Where lawful and appropriately governed, evaluate:

- Destination coverage across demographic groups
- Differences in route length
- Differences in education burden
- Differences in confidence labels
- Rate of high-opportunity career recommendations
- Rate of irrelevant or harmful suggestions
- User-reported bias

Fairness evaluation data must be separated from production ranking inputs.

### 29.4 Human Review

Create a review process for:

- Reported discriminatory recommendations
- Sensitive career categories
- Unexpected route exclusions
- Explanations that rely on stereotypes
- Repeated low-evidence recommendations

---

## 30. Accessibility Requirements

The MVP should target WCAG 2.2 AA.

Required behavior:

- Every map function is keyboard accessible.
- Every node has an accessible name, type, and state.
- Every edge explanation is available without visual tracing.
- A structured list or step view mirrors the graph.
- Screen-reader users can move by route, node, and branch.
- Focus order remains logical after graph updates.
- Focus is not lost when a detail panel opens or closes.
- Color is not the only differentiator.
- Text meets contrast requirements.
- Zoom does not break layout.
- Touch targets are sufficiently large.
- Animations respect reduced-motion settings.
- Error messages identify the affected field.
- Plain-language summaries accompany complex visuals.

The alternative structured view is a core product representation, not a secondary accessibility afterthought.

---

## 31. Content and Language Guidelines

### 31.1 Tone

Use language that is:

- Clear
- Encouraging without making promises
- Direct
- Non-judgmental
- Appropriate for users without career vocabulary
- Specific about uncertainty

### 31.2 Preferred Language

- "Possible career"
- "May fit"
- "One route"
- "Commonly observed"
- "Transferable skill"
- "Additional preparation may help"
- "Limited evidence in the available data"
- "Try another route"

### 31.3 Avoided Language

- "Perfect career"
- "Best career for you"
- "Guaranteed"
- "You are not qualified"
- "You cannot"
- "People like you always"
- "Normal path"
- "Correct path"
- "Failure"

### 31.4 Explanation Template

A useful explanation contains:

1. The recommendation
2. The specific user evidence
3. The path or role evidence
4. The uncertainty or limitation
5. An optional next exploration action

Example:

> "UX research may fit because your psychology coursework, interview project, and interest in technology overlap with common responsibilities in the role. The available career histories show several routes through research projects, internships, and adjacent analyst roles. This is one possibility, and you can expand the map to see alternatives."

---

## 32. Empty, Error, and Edge States

### 32.1 Minimal Profile

If the profile is nearly empty:

- Ask for interests, favorite activities, subjects, or a role.
- Offer example inputs.
- Do not show an empty map.
- Generate broader career families with a low-context label.

### 32.2 No Formal Experience

- Use projects, coursework, clubs, volunteering, and interests.
- Explain that formal work experience is not required to explore.

### 32.3 No Similar Cohort

- State that there is not enough aggregate data.
- Do not display a tiny cohort.
- Use skill and role-taxonomy evidence.
- Offer nearby role families.

### 32.4 Conflicting Preferences

Example: The user wants a role that usually requires on-site laboratory work but selects remote-only.

The system should:

- Explain the conflict.
- Preserve the destination.
- Offer adjacent remote-compatible roles.
- Let the user relax the constraint.

### 32.5 Broad Destination

Example: "I want to work in healthcare."

- Offer several role families.
- Ask no more than one concise clarifying question at a time.
- Allow the user to skip and see a broad map.

### 32.6 Unrecognized Destination

- Suggest canonical titles or related role families.
- Let the user provide a short description.
- Do not silently map to an unrelated role.

### 32.7 Generation Failure

- Preserve user input.
- Explain that generation failed.
- Offer retry.
- Offer a simpler static experience when possible.
- Provide a trace identifier for support without exposing internals.

### 32.8 Stale Saved Map

When data or profile information has changed:

- Keep the original map viewable.
- Label the generation date.
- Offer regeneration.
- Explain that a regenerated map may differ.

### 32.9 Cyclical or Nonlinear History

Support:

- Career gaps
- Concurrent roles
- Returning to education
- Freelance work
- Caregiving
- Industry pivots
- Downshifts or lateral moves

Do not force every path into a promotion ladder.

### 32.10 International or Unmapped Credentials

- Preserve the user's original credential.
- Avoid declaring it equivalent without reliable mapping.
- Ask for context or use broad education-level categories.

---

## 33. Nonfunctional Requirements

### 33.1 Performance

Initial targets:

- Entry and profile pages should meet standard web performance budgets.
- Existing saved maps should load within 2 seconds at the 75th percentile under normal conditions.
- New map generation should return an initial usable map within 8 seconds at the 75th percentile.
- Show a meaningful loading state after 300 milliseconds.
- Local node selection and branch highlighting should respond within 100 milliseconds.
- Large graphs must be progressively rendered or simplified.

Targets should be validated after a working prototype.

### 33.2 Reliability

- Saving a map must be idempotent.
- Regeneration must not corrupt the previous saved version.
- API retries must not create duplicate maps.
- A partial AI failure must not return malformed graph data.
- The graph must pass schema and integrity validation before display.

### 33.3 Scalability

- Cache stable role details and taxonomy data.
- Precompute aggregate transition artifacts.
- Avoid scanning raw histories during a user request.
- Set hard limits on generated node and edge counts.
- Support horizontal backend scaling.

### 33.4 Observability

Track:

- Request latency
- Generation latency by stage
- API error rate
- Schema-validation failures
- Empty-result rate
- Insufficient-evidence rate
- Privacy suppression rate
- Model and data versions
- User-reported unsafe or biased output

Logs must exclude unnecessary personal information.

### 33.5 Maintainability

- Use typed schemas shared through generated contracts or aligned definitions.
- Separate ranking, graph generation, explanation, and persistence.
- Keep source-data processing separate from online request handling.
- Add automated migration and versioning practices.
- Document major product decisions.

---

## 34. Visualization MVP Scope

### 34.1 Included

- Responsive Next.js application
- Flask API
- Manual student-profile input
- Optional adapter for provided career-history data
- Explore mode
- Build My Path mode
- Three to five destinations in Explore
- Two or more route variants in Build My Path when data permits
- Current-standing, role, destination, and experience nodes
- Directed, branching edges
- Node detail panel
- Fit explanations
- Typical role responsibilities
- Existing and transferable skills
- Transition explanations
- Aggregated similar-history evidence
- Honest limited-data states
- Branch expansion and collapse
- Pin, dismiss, regenerate, and undo
- Save and reopen map
- Feedback and report controls
- Desktop and mobile layouts
- Keyboard and structured-list access
- Synthetic development dataset
- Versioned API and data contracts

### 34.2 Explicitly Deferred

- Live LinkedIn authentication or profile import, unless access is already available
- Live jobs
- Live course catalog
- Scholarship matching
- School club inventory
- Networking recommendations
- Mentor matching
- Application-history filtering
- Precise salary data
- Hiring-demand forecasts
- Cost comparison
- Time-to-destination prediction
- Side-by-side quantitative path comparison
- Notifications
- Social sharing beyond a privacy-safe basic view
- Public professional-post analysis

### 34.3 MVP Complexity Limits

Recommended initial limits:

- Maximum 5 visible destination branches
- Maximum 3 visible route variants per destination
- Maximum 7 primary steps in one route
- Maximum 25 initially rendered nodes
- Additional nodes available through expansion
- Short labels with details in the side panel

These limits should be tested with users rather than treated as permanent.

---

## 35. Future Roadmap

### Phase 1: Visualization Foundation

- Profile input
- Explore
- Build My Path
- Interactive graph
- Explainability
- Aggregate historical evidence
- Save and feedback

### Phase 2: Actionable Next Steps

- Skills to learn
- Portfolio projects
- Courses and certificates
- Scholarships
- School clubs
- Internships and entry-level roles
- Networking communities

Filtering should consider:

- School year
- Location
- Availability
- Eligibility
- Prior applications
- User-completed steps

### Phase 3: Path Comparison

- Compare time
- Compare estimated cost
- Compare education requirements
- Compare salary ranges
- Compare hiring demand
- Compare work style
- Compare confidence and evidence
- Compare how much of the user's current skill set transfers

### Phase 4: Ongoing Career Navigation

- Progress tracking
- Profile updates reflected in the map
- New route suggestions
- Mentor and alumni discovery
- Informational interview prompts
- Application and learning progress
- Alerts when a relevant opportunity appears

### Phase 5: Broader Ecosystem

- Advisor views with user permission
- School partnerships
- International taxonomies
- Multilingual career previews
- Workforce and employer pathway programs

---

## 36. Success Metrics

### 36.1 North-Star Outcome

**Career Clarity Gain:** The percentage of users who report greater clarity after using Path[IN] than before using it.

Measure with a short pre/post question such as:

> "How clear are you about careers you may want to explore?"

### 36.2 Activation

- Percentage who complete minimum profile input
- Percentage who generate a first map
- Percentage who open at least one node detail
- Percentage who explore at least two destinations or route branches

### 36.3 Engagement

- Destination expansion rate
- Average meaningful nodes inspected
- Alternative-route usage
- Mode-switch rate
- Save rate
- Return rate
- Path regeneration rate

High interaction is not automatically success. Repeated regeneration may indicate poor relevance.

### 36.4 Usefulness

- Recommendation relevance rating
- Explanation helpfulness rating
- Percentage who identify a next step
- Percentage who save at least one path
- Percentage who report discovering a previously unknown career

### 36.5 Quality and Trust

- Unsupported-claim rate
- Inaccurate-role-description rate
- Low-evidence route rate
- Insufficient-evidence handling accuracy
- User-reported bias rate
- Privacy incident rate
- Recommendation diversity
- Explanation-grounding score

### 36.6 Guardrail Metrics

- Percentage believing a path is guaranteed
- Percentage feeling discouraged after use
- Overconcentration in a small set of careers
- Route-length disparities
- Education-burden disparities
- Small-cohort exposure attempts
- Sensitive-data leakage

---

## 37. Analytics Events

Suggested events:

- `pathin_opened`
- `consent_reviewed`
- `profile_field_enabled`
- `profile_field_disabled`
- `profile_completed`
- `mode_selected`
- `map_generation_started`
- `map_generation_completed`
- `map_generation_failed`
- `destination_viewed`
- `destination_dismissed`
- `destination_pinned`
- `node_opened`
- `edge_explanation_opened`
- `branch_expanded`
- `branch_collapsed`
- `route_alternative_requested`
- `map_regenerated`
- `map_saved`
- `map_reopened`
- `recommendation_feedback_submitted`
- `bias_or_safety_report_submitted`
- `structured_view_opened`

Analytics payloads should use internal IDs and categories rather than raw profile text.

---

## 38. Evaluation Plan

### 38.1 Product Research

Conduct moderated sessions with:

- Undecided high school or college students
- Goal-directed students
- First-generation students
- Students with no formal experience
- Recent graduates

Research questions:

- Do users understand what each node and edge means?
- Can they distinguish a possibility from a prediction?
- Do they understand why a role was recommended?
- Is the map inspiring, overwhelming, or discouraging?
- Can they find an alternative route?
- Do they trust aggregate historical evidence?
- What information do they expect inside a bubble?
- Does the map increase career clarity?

### 38.2 Data Evaluation

- Title-normalization accuracy
- Skill-normalization accuracy
- Transition validity
- Cohort privacy compliance
- Coverage by career family
- Coverage by education stage
- Coverage by geography
- Data freshness

### 38.3 Recommendation Evaluation

- Destination relevance
- Destination diversity
- Route plausibility
- Route distinctness
- Constraint adherence
- Skill-transfer accuracy
- Explanation faithfulness
- Unsupported-claim rate
- Sparse-data behavior

### 38.4 Human Review Rubric

Reviewers score:

1. Is the destination relevant?
2. Is every transition plausible?
3. Is each explanation grounded?
4. Are alternatives meaningfully different?
5. Does the route avoid unnecessary education or prestige assumptions?
6. Is uncertainty communicated honestly?
7. Is the language respectful and understandable?

---

## 39. Testing Strategy

### 39.1 Frontend Tests

- Profile form validation
- Consent controls
- Graph rendering from known fixtures
- Node selection
- Backward and forward traversal between connected nodes
- Previous, Next, and multi-branch selection
- Detail-panel section navigation
- Viewport and node-state restoration after returning
- Edge selection
- Branch expansion and collapse
- Pin and dismiss behavior
- Regeneration state
- Detail panel content
- Mobile layout
- Keyboard navigation
- Structured alternative view
- Loading, empty, and error states

### 39.2 Backend Tests

- Request validation
- Profile normalization
- Candidate generation
- Constraint filtering
- Route generation
- Cycle prevention
- Route diversity
- Evidence attachment
- Privacy-threshold enforcement
- Insufficient-data behavior
- Explanation schema validation
- Authorization
- Save and retrieve behavior
- Idempotency
- Version recording

### 39.3 Data Tests

- Required columns
- Type validation
- Duplicate detection
- Date consistency
- Title mapping coverage
- Cohort minimums
- Re-identification risk checks
- Unauthorized-field exclusion
- Aggregate count consistency

### 39.4 End-to-End Tests

1. An undecided student enters interests and receives an Explore map.
2. A user selects a destination and receives multiple routes.
3. A user dismisses a step and requests an alternative.
4. A user edits a skill and regenerates while preserving a pinned destination.
5. A sparse-data role produces a transparent limited-evidence state.
6. A keyboard-only user completes the core flow.
7. A saved map reopens with its original version metadata.
8. An unauthorized user cannot access another user's map.

### 39.5 Safety Tests

- Prompt injection in profile text
- Attempts to request protected-attribute ranking
- Attempts to reveal source individuals
- Small-cohort reconstruction attempts
- Claims of guaranteed employment
- Fabricated cohort counts
- Stereotyped role recommendations
- Sensitive information in logs

---

## 40. MVP Acceptance Criteria

The MVP is acceptable only when all P0 requirements are met and the following scenarios pass.

### AC-001: Experience-Light Explore

Given a student with no formal job history but at least three interests, skills, courses, projects, or activities, when they choose Explore, then the product generates a non-empty map with at least three relevant destinations and grounded explanations.

### AC-002: Current Standing

Given a generated map, when the user opens the current-standing node, then they can see and edit every profile category used to generate it.

### AC-003: Destination Explanation

Given a recommended destination, when the user opens it, then the product explains why it may fit using specific authorized profile inputs.

### AC-004: Build My Path

Given a recognized destination and sufficient evidence, when the user generates a path, then the product returns at least two meaningfully different route variants.

### AC-005: Transition Explanation

Given any visible edge, when the user selects it, then the product explains what the connection means and identifies its evidence type.

### AC-006: Alternative Step

Given an intermediate node, when the user requests an alternative, then the product replaces or branches that node without removing pinned nodes.

### AC-007: Historical Evidence

Given an aggregate cohort above the privacy threshold, when the user opens evidence details, then the product shows generalized patterns and no identifiable source person.

### AC-008: Insufficient Evidence

Given a cohort below the threshold, when the map is generated, then the API suppresses cohort details and the UI clearly communicates limited evidence.

### AC-009: User Control

Given a generated map, when the user hides a profile field and regenerates, then the new generation does not use that field.

### AC-010: Non-Deterministic Language

Given any generated content, then no visible copy guarantees an outcome or describes a recommended route as the only correct route.

### AC-011: Save and Reopen

Given a generated map, when the user saves and reopens it, then the same nodes, edges, profile snapshot, and version metadata are available.

### AC-012: Accessibility

Given a keyboard or screen-reader user, when they use the product, then they can inspect the current standing, destinations, routes, details, and alternatives without relying on pointer input or visual tracing.

### AC-013: Mobile

Given a supported mobile viewport, when a user opens a map, then labels remain readable, nodes remain selectable, and the primary route can be followed without horizontal page overflow.

### AC-014: Failure Recovery

Given a generation error, when the user retries, then all profile input and selected constraints remain intact.

### AC-015: Reporting

Given a node or edge, when the user reports it as inaccurate or biased, then the report includes the target, map version, and model/data versions without requiring the user to re-enter context.

### AC-016: Click-Through Node Navigation

Given any visible current-standing, skill, experience, role, or destination bubble, when the user clicks, taps, or opens it with the keyboard, then the product opens that node's applicable detail sections and preserves the map behind it.

### AC-017: Backward and Forward Traversal

Given any node with previous or next connections, when the user chooses Previous or Next, then the product moves one connected step backward toward the current standing or forward toward the destination without resetting the route or viewport.

### AC-018: Branch Traversal

Given a node with multiple previous or next connections, when the user navigates in that direction, then the product presents all available connected branches and does not choose one without the user's input.

### AC-019: Vertical Map Navigation

Given a vertically oriented map taller than the viewport, when the user scrolls, pans, taps nodes, or uses directional keyboard controls, then they can move up and down the full route and return to their original node with its state intact.

---

## 41. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Paths are interpreted as guarantees | User harm and loss of trust | Persistent possibility language, multiple routes, user testing |
| Historical bias is reproduced | Unequal recommendations | Diversification, audits, proxy review, skill-based routes |
| Source histories expose individuals | Privacy harm | Aggregation, thresholds, suppression, backend enforcement |
| AI invents evidence | Misleading guidance | Structured graph grounding, schema validation, source IDs |
| Map becomes visually overwhelming | Low comprehension | Progressive disclosure, node limits, route focus |
| Recommendations are too generic | Low utility | Specific profile evidence, feedback, richer input |
| Recommendations are too narrow | Reduced exploration | Diverse candidate re-ranking and "show different" control |
| Sparse dataset coverage | Missing or weak routes | Honest labels, taxonomy evidence, broader role families |
| Title normalization is inaccurate | Incorrect paths | Mapping confidence, human review, raw-title preservation |
| Students feel judged by gaps | Emotional harm | Strength-based language and recognition of informal experience |
| Users over-share personal data | Privacy risk | Data minimization, field controls, clear explanations |
| Underage users create compliance risk | Legal and ethical risk | Age policy and specialized review |
| Live opportunity data becomes stale | Misleading actions | Freshness timestamps and source-specific refresh rules |
| Graph library limits accessibility | Product exclusion | Accessibility spike and structured alternative view |
| Generation latency is high | Abandonment | Precomputed graph, staged loading, caching |

---

## 42. Open Decisions

The following decisions remain before implementation can be considered production-ready:

1. What exact fields exist in the available career-history dataset?
2. What permission or license governs that dataset?
3. How many histories and career families does it cover?
4. What date range and geography does it represent?
5. What minimum cohort size passes privacy review?
6. Which role and skill taxonomy will be authoritative?
7. Does the prototype use authentication or a temporary anonymous session?
8. Is the first supported market the United States?
9. Which age groups are eligible for the first release?
10. Which profile fields are imported versus manually entered?
11. Which graph-rendering approach best meets accessibility and mobile needs?
12. How are role descriptions sourced and updated?
13. What is the initial persistence layer?
14. Will saved maps be private by default? The recommended answer is yes.
15. What qualitative evidence labels will be used?
16. What level of route generation may be inferred when historical evidence is sparse?
17. Which actions require explicit confirmation?
18. What legal review is required before using LinkedIn-derived histories?

These are implementation decisions, not gaps in the core concept.

---

## 43. Example User Scenario

### Profile

Sarah is a college sophomore studying psychology. She has:

- Completed research-methods coursework
- Written for a student publication
- Volunteered at a community organization
- Used spreadsheets for a class project
- Expressed interests in technology, behavior, and helping people
- Selected remote or California-based work
- No declared target career

### Explore Result

Path[IN] could recommend:

- UX researcher
- Customer insights analyst
- Learning experience designer
- Product operations coordinator
- Community program specialist

For UX researcher, the map might show:

`Current standing -> Research project -> UX research internship -> Junior UX researcher -> UX researcher`

An alternative could show:

`Current standing -> Customer support or community role -> Customer insights analyst -> UX researcher`

### Explanation

The role may fit because:

- Psychology coursework connects to human behavior and research.
- Writing experience supports synthesis and communication.
- Community volunteering demonstrates listening and stakeholder interaction.
- The user's technology interest aligns with product research settings.

### Evidence

The evidence panel might say:

> "The available aggregate histories contain several routes from psychology, social science research, customer-facing work, and analyst roles into UX research. Internship-first and adjacent-role routes both appear. Counts are grouped to protect individual identities."

### User Action

Sarah selects UX researcher, opens Build My Path, removes the internship-first route because she needs paid work, and requests an alternative. The system generates an adjacent-role path through customer insights. She saves both paths.

In a later release, the product could recommend:

- A portfolio research project
- A campus research club
- A relevant scholarship
- A paid customer insights internship
- Alumni working in UX research

---

## 44. Master Product and Design Prompt

> Design Path[IN], an AI-powered LinkedIn career-exploration feature primarily for students and Gen Z users who do not yet have a clear career plan. The feature should transform a user's authorized education, coursework, work and volunteer experience, projects, activities, skills, interests, location preferences, goals, and constraints into an interactive career map made of connected bubbles or nodes.
>
> Support two primary modes. Explore should automatically recommend several diverse career destinations and let the user simulate what each career could look like. Build My Path should let the user choose a destination and generate multiple plausible routes from the user's current standing toward that role. The map should show the current standing, projects, clubs, internships, skills, entry-level roles, intermediate positions, destinations, alternative branches, and points where routes can converge or change.
>
> Every destination, node, and transition must be explainable. Make every current-standing, skill, experience, role, and destination bubble clickable, tappable, and keyboard accessible. When a user selects a bubble, open that node's applicable detail sections and show why it may fit, which profile inputs influenced the recommendation, typical responsibilities, common work outputs, existing skills, transferable skills, skills to develop, possible previous and next steps, alternative routes, and a concise preview of what the work may involve. Let the user click through connected bubbles in either direction, moving backward toward their current standing or forward toward a destination with persistent Previous, Next, and branch controls. Preserve the selected route, expanded branches, panel section, and map viewport while navigating. When a user selects an edge, explain why the two nodes are connected and whether the connection comes from aggregated historical evidence, a maintained role and skill taxonomy, or a clearly labeled inference.
>
> Inform routes using real career histories only when the data is properly authorized. Normalize those histories into role families and aggregate them into privacy-safe cohorts. Never expose or reconstruct an identifiable person's timeline. Show sufficiently large, anonymized patterns from people with overlapping education, skills, experience level, or starting roles. Clearly state when evidence is sparse. Do not fabricate people, cohort sizes, transitions, salaries, demand, or credentials.
>
> Present all routes as possibilities rather than predictions, promises, or mandatory sequences. Show multiple routes by default and let users expand, collapse, pin, dismiss, edit, and regenerate branches. Preserve pinned choices during regeneration. Let users review and control every profile field used by the system. Recognize coursework, projects, clubs, volunteering, caregiving, and informal experience instead of treating paid work as the only valid preparation.
>
> Design for the risk that historical career data reproduces unequal access. Do not use protected characteristics to narrow recommendations. Avoid prestige-only assumptions, diversify destinations and routes, include skill-based and adjacent-role paths, explain uncertainty, and never treat underrepresentation as evidence that a user does not belong in a career.
>
> Make the first release visualization-first. Include profile input, Explore, Build My Path, a responsive branching graph, role and transition details, skill-transfer explanations, aggregate similar-history evidence, saving, regeneration, feedback, mobile support, keyboard access, and a structured non-visual path view. Keep the initial map easy to understand through progressive disclosure and limit the number of visible destinations and steps.
>
> Plan future versions that can recommend practical next steps such as skills, projects, courses, scholarships, clubs, internships, entry-level jobs, communities, and networking opportunities. Future recommendations should account for location, school year, eligibility, availability, prior applications, and completed experiences. Later versions may compare paths by estimated time, cost, education requirements, salary, hiring demand, work style, difficulty, and skill transfer.
>
> Use clear, non-judgmental language appropriate for users with limited career vocabulary. Avoid phrases such as "perfect career," "best career," "you cannot," or "guaranteed." Ensure the product is accessible on desktop and mobile, supports keyboard and screen-reader use, does not rely on color alone, and provides a structured alternative to the visual map.
>
> The implementation should use a Next.js TypeScript frontend and a Flask backend with versioned JSON APIs. The backend should own profile normalization, recommendation logic, historical graph retrieval, privacy-threshold enforcement, route generation, explanation grounding, persistence, and feedback. The frontend should own profile controls, map interaction, detail views, accessibility, responsive behavior, and user-facing states. Store data, taxonomy, model, and prompt versions with every generated map.

---

## 45. Prototype Build Prompt

> Build a responsive Path[IN] prototype using a Next.js TypeScript frontend and Flask backend. Create a student profile form, an Explore mode that returns three to five career destinations, and a Build My Path mode that returns at least two branching routes toward a selected role. Render the result as an interactive graph with distinct nodes for current standing, skills, experiences, entry-level roles, intermediate roles, and destinations. Every node must be clickable, tappable, and keyboard focusable. Selecting a node must open its applicable detail sections with a role or experience preview, fit reasons, existing and transferable skills, skill gaps, adjacent steps, and aggregate similar-career evidence. Provide persistent Previous and Next controls so users can move backward toward their current standing or forward toward a destination, show a chooser at branches, and allow direct vertical and horizontal panning without losing the selected node or viewport. Selecting an edge must explain the transition and its evidence type. Support branch expansion, pinning, dismissal, alternatives, regeneration, saving, mobile layout, keyboard navigation, and a structured list view. Use versioned structured JSON fixtures first, keep all generated claims grounded in those fixtures, and clearly label paths as possibilities rather than guarantees.

---

## 46. Definition of Done for the Product Specification

This specification is thorough enough to begin design and technical decomposition when:

- The team agrees on the target audience and first market.
- The available dataset has a documented schema, provenance, permission, and coverage report.
- The MVP and deferred features are accepted.
- The node and edge semantics are accepted.
- The two core user flows are accepted.
- Privacy and cohort-threshold rules have owners.
- Fairness evaluation has an owner.
- Accessibility requirements are included in design from the start.
- API contracts are converted into implementation schemas.
- Success metrics and analytics events are reviewed.
- Remaining open decisions are assigned rather than ignored.

The document intentionally separates a complete product vision from the smaller visualization MVP. That separation allows the first version to remain buildable without losing the broader goal of turning career uncertainty into an understandable and actionable plan.

---

## 47. Original Concept Traceability

This matrix confirms where every material idea from the original sketch and follow-up decisions appears in the specification.

| Original idea | Product interpretation | Primary specification location |
| --- | --- | --- |
| People are overwhelmed by job content | Reduce fragmented information into a personalized visual map | Sections 3, 4, and 5 |
| People lack access to opportunities | Surface routes and later connect them to actionable resources | Sections 4, 35, and 49 |
| People are uncertain about careers | Support open-ended discovery without requiring a target | Sections 4, 8, 9, and 14 |
| Analyze a user's profile | Use authorized education, experience, projects, skills, interests, location, and goals | Sections 13, 19, 20, and 22 |
| Suggest career paths | Generate evidence-informed destinations and intermediate steps | Sections 14, 15, 16, and 22 |
| Preview careers | Explain responsibilities, environment, outputs, challenges, and fit | Sections 18 and 48 |
| Simulate careers | Let users explore role scenarios, path changes, and preference tradeoffs | Sections 14, 17, and 48 |
| User profile includes name, school history, and job history | Use relevant profile fields while excluding identity fields that are unnecessary for ranking | Sections 13, 20, and 28 |
| Career exploration spans industries | Recommend across career families when skills and interests transfer | Sections 14 and 22 |
| Show what job opportunities could look like | Provide destination previews and route-specific examples | Sections 18 and 48 |
| Career path preview | Show current standing, intermediate roles, experiences, and destinations | Sections 15, 16, and 17 |
| Similar user education, position, and history | Build privacy-safe cohorts using overlapping background dimensions | Section 21 |
| Similar users progress through later positions | Aggregate ordered role transitions and path clusters | Sections 21, 22, and 27 |
| Similar users have accomplishments or accolades | Support accomplishment evidence as a future node and profile signal | Sections 16, 20, and 49 |
| Scrape posts to understand how positions were acquired | Consider only authorized public narratives with rights, privacy, and evidence controls | Section 21.8 |
| Recommend scholarships | Add eligibility-aware scholarship matching after the visualization MVP | Sections 23.7, 35, and 49 |
| Exclude scholarships already applied for | Use application-history deduplication with explicit user permission | Sections 23.7 and 49 |
| Filter by school year | Include school stage and graduation timing in future eligibility rules | Sections 13, 20, 23.7, and 49 |
| Recommend high-school or local clubs | Match school and community activities by availability, location, age, and access | Sections 23.7, 35, and 49 |
| Generate current standing to suggested positions | Build an ordered, branching path beginning at the current-standing node | Sections 15, 16, and 19 |
| Explore mode | Automatically discover several fitting career destinations | Section 14 |
| Build My Path mode | Generate routes to a user-selected destination | Section 15 |
| Why a role fits | Ground explanations in user-authorized evidence | Sections 18 and 22 |
| Required and transferable skills | Separate existing, transferable, and missing skills | Sections 18 and 22 |
| Typical responsibilities | Provide plain-language role details | Section 18 |
| Salary and hiring demand | Add sourced, dated labor-market information in a later release | Sections 18, 23.7, 35, and 49 |
| People with similar backgrounds | Show aggregated similar-path patterns above a privacy threshold | Section 21 |
| Recommended courses, experiences, and connections | Add a future action layer linked to specific path transitions | Sections 23.7, 35, and 49 |
| Alternative branches | Generate, expand, replace, pin, and dismiss route alternatives | Sections 15, 16, and 17 |
| Click through bubbles and move up or down the path | Make every node interactive and support backward, forward, vertical, horizontal, pointer, touch, and keyboard traversal | Sections 17, 18, 23.8, and 40 |
| Paths are not guaranteed | Use possibility language and honest uncertainty throughout | Sections 6, 10, 15, and 31 |
| Users control analyzed information | Provide category-level consent, editing, hiding, and deletion | Sections 13, 20, and 28 |
| Historical data may reproduce inequality | Add fairness constraints, audits, diversification, and human review | Section 29 |
| Students and Gen Z are primary users | Define student-centered personas, inputs, language, and safeguards | Sections 7 and 8 |
| System can recommend or accept a destination | Support both Explore and Build My Path | Sections 14 and 15 |
| Use real LinkedIn histories | Require authorization, provenance, aggregation, and suppression | Section 21 |
| First release is visualization | Define a bounded visualization-first MVP | Section 34 |
| Compare costs later | Defer quantitative path comparison to Phase 3 | Sections 23.7 and 35 |
| Next.js frontend and Flask backend | Define responsibilities, APIs, repository structure, and local prerequisites | Sections 25 and 26 |

---

## 48. Career Preview and Simulation Specification

### 48.1 Purpose

Career preview answers:

> "What is this career actually like?"

Career simulation answers:

> "How might this career and the route toward it feel or change under different choices?"

The MVP should provide informative previews. Later releases can add richer simulations. Neither feature should pretend to reproduce every workplace or predict personal satisfaction.

### 48.2 MVP Career Preview

Every destination preview should include:

- A plain-language role summary
- Three to six common responsibilities
- Typical work outputs
- Common collaborators
- Broad work setting
- A representative project
- Skills used frequently
- Tasks that may appeal to the user's stated interests
- Tasks that may conflict with the user's stated preferences
- Common adjacent roles
- A statement that responsibilities vary by employer and industry

Example:

> "A UX researcher studies how people use products and turns those observations into recommendations for design and product teams. A typical project might involve planning interviews, speaking with users, identifying patterns, and presenting findings. The role may appeal to you if you enjoy psychology, open-ended questions, and explaining evidence. It may be less appealing if you strongly dislike interviews, ambiguity, or frequent collaboration."

### 48.3 MVP Path Simulation

The visual map itself acts as a lightweight simulation. A user can:

- Select a destination and reveal a possible route.
- Remove an unwanted step and request an alternative.
- Pin a preferred experience.
- Change a profile input or constraint and regenerate.
- Compare an internship-first route with a project-first or adjacent-role route.
- Inspect how a new skill changes possible transitions.
- See where routes branch and reconverge.

The product should describe this as "exploring scenarios," not calculating a certain future.

### 48.4 Future Interactive Simulation

Future versions may allow users to change controlled variables:

- Add or remove a skill
- Add a hypothetical course or certification
- Change location
- Change remote or in-person preference
- Change willingness to pursue more education
- Change target industry
- Change available weekly time
- Change financial constraints
- Add a hypothetical internship, project, or club

The simulation can then show:

- Newly available routes
- Routes that become shorter or longer
- New skill bridges
- Changed evidence strength
- Changed opportunity availability
- Tradeoffs in time, cost, and education

### 48.5 Simulation Guardrails

- Do not claim a simulated choice causes employment.
- Do not generate precise probabilities unless they are validated and calibrated.
- Do not imply that expensive education is automatically superior.
- Do not hide routes merely because they are uncommon.
- Do not use protected characteristics as simulation variables.
- Clearly distinguish the user's actual profile from hypothetical additions.
- Reset hypothetical changes without altering the source profile.
- State which output changes came from which simulated input.

### 48.6 Career Preview Sources

Role previews should be grounded in approved, maintained sources. Each preview should record:

- Source identifiers
- Last reviewed date
- Supported region
- Taxonomy version
- Whether text was curated, summarized, or generated

User-generated professional narratives may complement structured descriptions but should not replace them.

### 48.7 Preview Quality Criteria

A preview is acceptable when:

- A student unfamiliar with the title can explain the role afterward.
- Responsibilities are concrete rather than promotional.
- The preview includes both appealing and challenging aspects.
- The content avoids stereotypes.
- The content does not overgeneralize one employer's practices.
- The preview is consistent with the connected skills and route.
- Any generated text is traceable to approved source material.

---

## 49. Future Opportunity Recommendation Specification

### 49.1 Purpose

The future action layer converts a visual route into practical opportunities. Recommendations should connect to a specific destination, transition, skill gap, or user constraint rather than appearing as a generic content feed.

Opportunity categories can include:

- Courses
- Certifications
- Portfolio projects
- Scholarships
- Grants
- Clubs
- Student organizations
- Competitions
- Volunteer opportunities
- Apprenticeships
- Internships
- Entry-level jobs
- Events
- Communities
- Alumni
- Mentors
- Informational interview candidates

### 49.2 Opportunity Entity

Each opportunity should contain:

- Canonical ID
- Title
- Provider or organization
- Category
- Description
- Skills developed
- Related role and transition IDs
- Eligibility rules
- Location
- Delivery mode
- School or institution availability
- Age or school-year constraints
- Application deadline
- Start date
- Cost
- Financial aid availability
- Time commitment
- Source URL
- Source and verification status
- Last verified timestamp
- User application or completion status

### 49.3 Recommendation Reasons

Every recommended opportunity should explain:

- Which path step it supports
- Which skill or evidence gap it addresses
- Why the user appears eligible
- Which eligibility facts still require confirmation
- Whether the opportunity is local, online, school-specific, or broadly available

### 49.4 Eligibility Filtering

Before showing a high-confidence recommendation, evaluate:

- School year
- Expected graduation date
- Age requirement
- Location
- School affiliation
- Field of study
- Academic requirements
- Citizenship or residency requirements when legally appropriate
- Work authorization when relevant
- Deadline
- Schedule
- Cost
- Required prior experience
- User-provided accessibility constraints

If eligibility cannot be verified, label the item:

> "You may be eligible. Confirm the requirements with the provider."

### 49.5 Prior Applications and Completion

With explicit permission, the system can use:

- Applied
- In progress
- Accepted
- Rejected
- Withdrawn
- Completed
- Not interested

Rules:

- Do not recommend an identical opportunity after the user marks it applied or completed.
- A rejected opportunity can reappear only for a new cycle and with clear labeling.
- A completed course can satisfy a path skill rather than remain a recommendation.
- The user can correct status.
- Application status is private by default.
- Do not infer rejection reasons.

### 49.6 Scholarship Recommendations

Scholarship matching must:

- Respect application deadlines.
- Verify the scholarship source.
- Identify known eligibility requirements.
- Filter prior applications when authorized.
- Avoid charging users for access to basic scholarship information.
- Warn about unverified or suspicious sources.
- Avoid claiming the user will receive an award.
- Distinguish renewable from one-time awards.
- Show whether the scholarship relates directly to a path or supports education generally.

### 49.7 Clubs and Student Organizations

Club recommendations should consider:

- The user's current school
- School year
- Membership eligibility
- Active status
- Meeting location or online availability
- Join period
- Cost
- Skills or experience the club may help develop
- Whether an equivalent community organization exists nearby

If school inventory is unavailable, recommend a club type rather than inventing a specific organization.

### 49.8 Courses and Certifications

Course recommendations should include:

- Skill outcome
- Level
- Prerequisites
- Provider
- Delivery mode
- Estimated time
- Verified price or price status
- Credential type
- Last verified date
- Relationship to the selected path

The system should not imply that a paid credential is required when equivalent project or work evidence may be acceptable.

### 49.9 Jobs and Internships

Job recommendations should:

- Connect to a visible path step.
- Distinguish internship, apprenticeship, contract, part-time, and full-time roles.
- Respect location and work-mode preferences.
- Use current availability.
- Show posting age.
- Avoid recommending expired roles.
- Avoid presenting a highly senior role as an immediate next step without explanation.
- Explain which listed qualifications the user appears to meet and which remain uncertain.

### 49.10 Networking Recommendations

Future networking suggestions can include:

- Alumni
- Professionals who opted into mentoring
- Relevant groups
- Events
- Communities
- Informational interview prompts

Requirements:

- Do not reveal that a person is part of an anonymous comparison cohort.
- Do not recommend contact based on sensitive inferred traits.
- Provide respectful outreach guidance.
- Rate-limit outreach features.
- Respect recipient preferences.
- Avoid implying an obligation to respond.

### 49.11 Freshness

Opportunity recommendations require stronger freshness controls than career paths:

- Store `lastVerifiedAt`.
- Define a refresh interval by source type.
- Remove or label expired opportunities.
- Recheck deadlines before display.
- Provide a report-stale control.
- Never generate a deadline that is missing from the source.

### 49.12 Ranking

Opportunity ranking can consider:

- Path relevance
- Skill-gap relevance
- Eligibility confidence
- Location fit
- Timing
- Cost fit
- User preference
- Provider trust
- Opportunity freshness
- Accessibility

Sponsored or paid placement must never be disguised as organic path relevance.

### 49.13 Opportunity Acceptance Criteria

- Every opportunity connects to at least one path node or edge.
- Every item has a source and freshness status.
- Eligibility uncertainty is visible.
- Expired items are suppressed.
- Prior applications are respected when permission exists.
- School and location availability are not invented.
- Costs are sourced and dated.
- Sponsored content is labeled.
- The user can dismiss, save, report, and update status.

---

## 50. Operational and Content Governance

### 50.1 Ownership

Before launch, assign owners for:

- Career taxonomy
- Skill taxonomy
- Historical dataset
- Privacy rules
- Fairness evaluation
- Role descriptions
- Opportunity sources
- Recommendation model
- Explanation prompts
- User reports
- Accessibility
- Incident response

### 50.2 Content Administration

Authorized administrators should be able to:

- Correct a role description
- Merge duplicate role titles
- Deprecate a role or alias
- Update skill relationships
- Disable a faulty transition
- Quarantine a dataset version
- Review reported content
- Publish a corrected graph artifact
- Record who approved the change

Administrative access must be authenticated, authorized, and audited.

### 50.3 Model and Data Rollback

The system must support rollback when:

- A model version produces unsafe paths.
- A dataset contains unauthorized or corrupted records.
- A taxonomy update breaks route quality.
- An explanation prompt introduces unsupported claims.

Rollback should not alter previously saved map records. Saved maps retain original version metadata and can be labeled as generated with an older version.

### 50.4 Incident Response

Define procedures for:

- Privacy leakage
- Re-identification risk
- Biased or discriminatory recommendations
- Unauthorized data use
- Compromised credentials
- Widespread incorrect role information
- Fabricated model claims
- Malicious profile input or prompt injection

The team should be able to disable generation while keeping informational pages and saved-map access available when safe.

### 50.5 Change Review

Material changes should require review when they affect:

- Profile fields used for ranking
- Cohort thresholds
- Protected or sensitive data handling
- Ranking objectives
- Confidence labels
- New opportunity providers
- Public sharing
- Minor eligibility
- Model providers
- Data retention

---

## 51. Release Readiness Checklist

### Product

- [ ] Primary audience and initial geography are confirmed.
- [ ] Explore and Build My Path flows are approved.
- [ ] MVP and deferred scope are accepted.
- [ ] Copy consistently presents possibilities rather than guarantees.
- [ ] User research validates that the graph is understandable.

### Design

- [ ] Desktop and mobile flows are complete.
- [ ] Every loading, empty, error, sparse-data, and stale-map state is designed.
- [ ] Node, edge, selection, branch, and evidence states are defined.
- [ ] The structured non-visual view is complete.
- [ ] Reduced-motion behavior is complete.

### Data

- [ ] Dataset permission and provenance are documented.
- [ ] Schema and coverage reports are complete.
- [ ] Title and skill normalization quality meets the agreed threshold.
- [ ] Privacy-safe aggregate artifacts are generated.
- [ ] Dataset and taxonomy versions are published.

### Recommendation Quality

- [ ] Candidate relevance meets the agreed evaluation threshold.
- [ ] Routes pass human plausibility review.
- [ ] Alternative routes are meaningfully distinct.
- [ ] Explanations are grounded.
- [ ] Sparse evidence is labeled correctly.
- [ ] No unsupported numerical confidence is shown.

### Privacy, Safety, and Fairness

- [ ] Consent copy is approved.
- [ ] User deletion and field exclusion work end to end.
- [ ] Cohort thresholds are enforced in the backend.
- [ ] Re-identification testing is complete.
- [ ] Fairness evaluation is complete.
- [ ] Bias and safety reporting is operational.
- [ ] Minor eligibility and age policy are resolved.

### Engineering

- [ ] API schemas are versioned.
- [ ] Authentication and authorization are tested.
- [ ] Saved maps include profile, data, model, and prompt versions.
- [ ] Retry and idempotency behavior is tested.
- [ ] Performance targets are met or exceptions are documented.
- [ ] Logs omit unnecessary personal data.
- [ ] Rollback procedures are tested.

### Accessibility

- [ ] Core flows pass keyboard-only testing.
- [ ] Core flows pass screen-reader testing.
- [ ] Color and contrast requirements pass.
- [ ] Zoom and reflow requirements pass.
- [ ] Touch targets pass.
- [ ] Reduced-motion settings are respected.

### Launch Operations

- [ ] Dashboards and alerts are configured.
- [ ] Support and escalation procedures are documented.
- [ ] User-report review has an owner and service target.
- [ ] Model, data, and taxonomy rollback are available.
- [ ] Known limitations are documented for users and support.
