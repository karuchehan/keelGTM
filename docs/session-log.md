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

### In Progress
- Remaining homepage sections to build
