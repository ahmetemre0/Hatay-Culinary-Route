# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### `artifacts/hatay-gastronomi` — Hatay Gastronomi Rotası (Card Game)

A fully playable digital card game based on Hatay's cuisine and culture.

- **Preview Path**: `/` (root)
- **Tech**: React + Vite, Tailwind CSS, Framer Motion, Zustand
- **Game Features**:
  - 25 Region (Bölge) cards, 55 Material (Malzeme) cards, 20 Event (Olay) cards
  - 2-4 player support
  - Turn-based gameplay: draw → match materials → complete regions → score points
  - Event cards with special actions (skip turn, steal, reshuffle, etc.)
  - Animated card interactions (Framer Motion)
  - Victory at 50 points
- **Key Files**:
  - `src/data/cards.ts` — All card data and deck building
  - `src/store/gameStore.ts` — Zustand game state (phases, turns, scoring)
  - `src/pages/SetupPage.tsx` — Player setup screen
  - `src/pages/GamePage.tsx` — Main game board
  - `src/pages/GameOverPage.tsx` — End screen
  - `src/components/GameCard.tsx` — Card component (region/material/event variants)
  - `src/components/MarketArea.tsx` — Market/draw area
  - `src/components/PlayerHand.tsx` — Player's hand
  - `src/components/Scoreboard.tsx` — Score panel
  - `src/components/EventModal.tsx` — Event card resolution UI
  - `src/components/GameLog.tsx` — Game log

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── hatay-gastronomi/   # Hatay card game (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
