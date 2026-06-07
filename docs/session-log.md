# keelGTM Website — Session Log

Running log of all discussions, decisions, and changes made to the website. Updated after each commit.

---

## Session: 2026-06-06

### Context at session start
- Branch: `main`
- Last commit before session: `d97998d Fix mobile responsiveness across all sections`

---

### Changes Made

#### Commit `80f7515` — Fix mobile hero: subtitle nowrap overflow, chips centering, bottom row alignment
**Problem identified from screenshot:**
- `hero-subtitle` had `white-space: nowrap` with no mobile override — text overflowed viewport edge
- `.hero-bottom` on mobile lacked `align-items: center` — chips and children left-aligned
- `.hero-chips` had no `justify-content: center` on mobile

**Fix:** Added mobile overrides in the `@media (max-width: 768px)` block:
- `hero-subtitle`: `white-space: normal`, `font-size: 0.82rem`
- `hero-bottom`: added `align-items: center`
- `hero-chips`: added `justify-content: center`

---

#### Commit `8022608` — Replace all white (#fff) with brand cream (#e1dfdb), hero form button to cream
**Instruction:** Every white color on the site must be `#e1dfdb`. Hero form "Book a Call" button must be cream, not orange.

**Changes:**
- `.hero-form .btn-form` background: `#ff5930` → `#e1dfdb`
- All `#fff` instances replaced with `#e1dfdb` (3 occurrences: `.btn-nav:hover`, `.btn-cta:hover`, `.team-linkedin:hover`)
- Zero `#fff` or `#ffffff` or `white` values remain in the file

---

---

#### Commit `24ad1eb` + `2e09ccc` — Add Offerings section (What We Do)

**Decision:** Section 2 (The Problem) left as-is for now. Moving to build remaining sections.

**Product update logged:** Prospect Validation Tool is now the first product in a suite called **Keel Tools**. Pricing updated:
- Pay-per-run: $49 / 500 prospects (was 250)
- Full setup: $499 shown as discounted from $999 (was $1,000 from $1,500)

**Section built:** `#offerings` inserted between `#problem` and `#craft` sections.

**Layout:** Two-column side-by-side cards on desktop (`1.35fr 1fr`), stacked on mobile.

**Left card — The Keel Build (primary):**
- Tag: "Done For You" (orange)
- Orange accent border
- Features: account list building, account enrichment, prospect list building, prospect enrichment, signal-based personalization (add-on)
- CTA: "Book a Call" → cal.com link

**Right card — Keel Tools (secondary):**
- Tag: "Self-Serve"
- Tool shown: Prospect Validation Tool
- Pay-per-run: $49 / 500 prospects
- Full setup: $499 (shown as discounted from $999) with "Limited offer" badge
- CTA: "Get Started" (placeholder, no action)

**Bug fixed:** Mobile override was placed before desktop CSS in the cascade, so desktop `1.35fr 1fr` grid overrode the `1fr` mobile rule. Fixed by moving mobile `@media` block after the desktop offerings CSS.

---

---

#### Commit `2ba3294` — Redesign offerings section completely

**Full redesign from scratch. Previous card layout discarded.**

**Structural changes:**
- Headline changed from "What We Do." to "What We Build."
- Section padding: `120px 6vw` (was `12vh 6vw`)
- Grid: `minmax(0, 1.58fr) minmax(0, 1fr)` — approximately 60/40 split
- Right card offset: `margin-top: 40px` for asymmetry

**Left card — The Keel Build:**
- Removed bullet list. Replaced with four numbered rows (01–04): num in Inter 0.7rem rgba(225,223,219,0.3), text in cream 0.95rem
- Thin divider below rows (rgba 0.08)
- Add-on row: orange pill "ADD-ON" + "Signal-based personalization" in muted text
- CTA: text link "Book a Call →" with arrow that translates 4px right on hover (0.25s ease)

**Right card — Keel Tools:**
- Background: rgba(225,223,219,0.03) — subtly lighter than left
- Removed heavy bordered pricing boxes. Replaced with two clean rows separated by a thin divider
- Row 1: Pay per run / 500 prospects left, $49 Playfair 1.4rem right
- Row 2: Full setup / Own it and run it forever left; $999 struck through + $499 right
- "Offer ends June 30" in rgba(255,89,48,0.7) 0.72rem below rows
- "Get Started" outline button: smaller, left-aligned, not full-width

**GSAP:** Left card fades up from y:40 opacity:0. Right card fades up from y:60 opacity:0 with 0.15s delay. Both trigger at `top 80%`.

**Mobile:** Grid collapses to 1fr, right card margin-top reset to 0.

---

#### Commit `f3cb9d9` — Overhaul offerings section: flow diagram, mockup panel, centered layout, consistent card sizing

**Keel Build card:**
- Replaced numbered rows + divider + add-on row with a visual flow diagram: input pills (Your ICP, Your Goals) → keelGTM center box (cream, no orange) → output pills (Verified Contacts, Enriched Data, Campaign Ready)
- Connector lines with subtle orange dots between layers
- Removed static "Book a Call" button. Added hover-reveal overlay (opacity 0 → 1 on card hover), gradient fades up from bottom 80px
- Watermark "Done For You" moved to bottom center, reduced to `clamp(2rem, 5vw, 5rem)`
- Renamed heading from "The Keel Build." to "Keel Build."

**Keel Tools card:**
- Replaced pricing rows entirely with a tool mockup panel: three rows (Prospect Validation, List Enrichment, Signal Qualification) with orange dot + label, thin dividers
- New description: "GTM systems combining AI workflows with human expertise. Built for teams who want to move faster without hiring for it."
- New tagline below panel: "Each system automates a specific part of your go-to-market motion. You run it. You own it."
- No Clay references anywhere in this card
- "Explore Tools" outline button (cream border, no underline, hover brightens border)
- Watermark "Self Serve" centered at bottom

**Layout:**
- Grid changed from `1.58fr / 1fr` to `1fr / 1fr` (equal 50/50)
- `align-items: stretch` on grid so both cards always match height
- Both cards: `min-height: 540px`, `padding-bottom: 100px`
- All content centered: `text-align: center`, `align-items: center` on base card

**Hover consistency (all cards sitewide):**
- Removed orange background fill on `.pain-point:hover` and `.pain-point:hover h3` color change
- All cards now use: `translateY(-4px)`, `border-color: rgba(225,223,219,0.12)`, `box-shadow: 0 20px 60px rgba(0,0,0,0.3)`
- Spotlight radial gradient hover added to `.craft-card`, `.service-card`, `.stack-card` (was only on offering cards)

**Reverted:**
- Smooth momentum scroll removed — broke native scroll behavior

---

#### Commit `d2b0e41` — Fix Problem section scroll timing: pure linear scrub

**Problem:** Cards snapped through too fast. Timeline hold periods created dead zones where page was pinned but nothing moved (felt like double-scroll required). `scrub` lag values (0.6–2) added settling delay at transitions.

**Fix:** Removed timeline entirely. Single `gsap.to('.pain-cards-track')` tween, `y: '-200vh'`, `ease: 'none'`, `scrub: true` (1:1), `end: '+=1500vh'`. Each card gets ~500vh of natural scroll distance. Motion tracks finger directly with zero lag.

**Key learning:** Hold periods = bad UX on pinned sections. Users interpret no visual change during scroll as broken. Natural hold comes from slow continuous motion over long scroll distance, not explicit paused keyframes.

---

---

## Session: 2026-06-07

### Context at session start
- Branch: `main`
- Last commit before session: `8240de5 Update session log: Problem section scroll timing fix details`

---

### Changes Made

#### Commit `109ca32` — Add custom cursor experience and social proof pill to hero section

**Custom cursor:**
- Replaces default browser cursor within the hero section only. Touch devices skip the entire system (`window.matchMedia('(hover: none)')`).
- Cursor element: `#keel-cursor`, 32x32px `assets/logos/2.svg`, `position: fixed`, `pointer-events: none`, `z-index: 9999`.
- Movement: single `requestAnimationFrame` per `mousemove` — instant tracking, no lag.
- `cursor: none !important` applied to `.hero.keel-cursor-active *` — `!important` required to override `.btn-form { cursor: pointer }` which has equal specificity.
- Scoped to hero via `mouseenter`/`mouseleave` on `.hero` element. Fixed `<nav>` overlaps hero bounding box so separate `navbar.mouseenter → deactivate` / `navbar.mouseleave (downward) → activate` handlers added.
- Cursor starts `opacity: 0`, fades to 1 on hero enter (0.3s ease), no native cursor bleed.

**Tooltip:**
- `#keel-tooltip` card appears after 200ms idle. Fades in with `scale(0.94) translateY(4px) → scale(1) translateY(0)` over 0.25s ease.
- Positioned at cursor +10px right, +20px down via CSS custom properties `--tt-x` and `--tt-y` with `tt-hidden` / `tt-visible` class swap.
- Suppressed when cursor is over `.hero-watch` or `.hero-social-proof` (checked via `e.target.closest()`).
- Copy: *keel* (n.) — "The structural fin beneath a ship's hull. The force beneath that holds course and drives everything forward."

**Social proof pill (`hero-social-proof`):**
- Changed from dead `<div>` to `<a>` linking to `https://cal.com/chehan-karunaratne/30min`.
- Text updated: "Trusted by 10+ B2B sales teams".
- At rest: fully transparent (no border, no background). Arrow button (`hero-proof-btn`) also transparent at rest — arrow SVG at same opacity as body text (`rgba(225,223,219,0.45)`).
- On hover: pill border fades in (`rgba(225,223,219,0.12)`). `::before` pseudo-element (spotlight radial) scales from 0.6 → 1 at `transform-origin: var(--mouse-x) var(--mouse-y)` over 0.4s — pill appears to grow from cursor entry point. Arrow button gets solid `#ff5930` background with cream arrow icon (matches play button design).
- Text lifts from 45% to 85% cream on hover.
- Spotlight `mousemove` tracker added to `.hero-social-proof` in existing card spotlight block.
- `text-decoration: none; color: inherit` prevents link default styles from showing.

**Key decisions:**
- Lerp tried at 0.12 and 0.2 but felt laggy and disconnected from click position. Removed entirely in favour of direct single-rAF per mousemove.
- `cursor: none !important` needed because `.hero-form .btn-form` (0,2,0 specificity) overrides `.hero.keel-cursor-active *` (also 0,2,0) since it appears later in the stylesheet.
- Hero `mouseleave` does not fire when mouse enters fixed nav (mouse stays within hero bounding box). Fixed with explicit nav listeners.

---

#### Commit `6119751` — Refine hero interactions: Watch Video hover, tooltip suppression, play button style

**Watch Video section:**
- Hover target expanded from just the play button to the entire `.hero-watch` container.
- `.hero-watch:hover .hero-watch-label`: color lifts to `#e1dfdb`, border-bottom brightens to `rgba(225,223,219,0.6)`.
- Play button style flipped: was orange at rest (`#ff5930`), now cream at rest (`#e1dfdb`) to match "Book a Call" button. On `.hero-watch:hover`: background → `#ff5930`, SVG fill → `#e1dfdb`.

**Tooltip suppression:**
- `resetTooltipTimer(e)` now checks `e.target.closest('.hero-watch, .hero-social-proof')`. If true, timer not started. Tooltip will not appear when cursor idles over these interactive zones.

---

### In Progress
- Remaining homepage sections to build
