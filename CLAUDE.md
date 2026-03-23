# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Campfre (Firekeeper)** is a personal productivity and self-awareness React app designed as a mobile-first single-page application. It helps the user (Jorge) manage focus through a lane-based priority system inspired by the Eisenhower Matrix, combined with life-phase tracking and reflective journaling.

The entire app lives in a single file: `firekeeper.jsx`.

## Architecture

### Single-file React app
- No build system, package manager, or bundler is configured — the file is a standalone JSX module exporting a default `App` component.
- Uses React hooks (`useState`, `useEffect`, `useRef`) exclusively — no class components.
- All styling is inline CSS objects (no CSS files, no Tailwind, no CSS-in-JS library). Global styles and keyframe animations are injected via a `<style>` tag inside the App component.
- Fonts loaded via Google Fonts CDN: **Plus Jakarta Sans** (body) and **Clash Display** (headings).

### Core Data Model
- **Lanes** (`LANES`): Activity categories (AI & Building, Gaming, Fitness, Social, Reflection) each with a color and default quadrant.
- **Items**: Tasks with `{ id, text, lane, urgency }`. Quadrant placement is *derived* via `deriveQuad()` based on the item's lane, the user's primary lane, side lanes, and any urgency override (`"q1"` or `"q3"`).
- **Phases** (`PHASES`): Life-cycle states — Lock-In → Expansion → The Gap → Re-lock. User self-selects.
- **Mood**: 1–5 energy scale.
- **Primary Lane / Side Lanes**: The primary lane maps to Q2 (Focus Deeply); toggled side lanes map to Q4 (Enjoy Freely). Changing lanes instantly re-sorts the matrix.

### Screen Structure (5 screens, bottom tab nav)
1. **HomeScreen** — Greeting, mood selector, rotating mantras, stats, phase/lane summary, gap callout.
2. **MatrixScreen** — 2×2 Eisenhower grid showing item counts per quadrant. Tapping a quadrant opens `QuadrantSheet` (bottom sheet) for CRUD.
3. **GapScreen** — Reflective journaling with prompts, gap rituals, and therapist-sourced truths. Standalone (no shared state with items).
4. **PhaseScreen** — Select current life phase from the cycle.
5. **LanesScreen** — Set primary lane and toggle side lanes; changes propagate to the matrix.

### Key Components
- `deriveQuad(item, primaryLane, sideLanes)` — Pure function that determines which quadrant an item belongs to.
- `QuadrantSheet` — Bottom-sheet modal for managing items within a quadrant (add, edit, delete, move between quadrants).
- `TaskRow` — Individual item row with inline edit, move-to-quadrant, and delete.
- `Orb` / `BreathOrb` — Decorative gradient circles with CSS animations.
- `LaneBadge` — Colored pill showing lane icon and label.

### State Management
All state lives in the root `App` component and is passed down via props. No context, no Redux, no external state library. Item IDs are generated via a module-level counter (`_id`).

## Design Tokens

Color palette defined in `T` object at the top of the file. Key colors: coral (#FF6B4A), amber (#FFAA5A), sage (#4FBFA8), lavender-blue (#8BA4D4), purple (#C17ADA). Dark theme with bg #131220.

## Development Notes

- No `package.json`, no test suite, no linter configured.
- To use this file, it needs to be imported into a React project (e.g., via Vite or Next.js) that provides React as a dependency.
- The app is designed for 430px max-width mobile viewport with safe-area-inset support.
- All data is in-memory only — no persistence (localStorage, API, or database).
