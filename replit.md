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

A fully playable digital card game based on Hatay's cuisine and culture. Supports both local and online multiplayer.

- **Preview Path**: `/` (root)
- **Tech**: React + Vite, Tailwind CSS, Framer Motion, Zustand, Socket.io-client
- **Game Modes**:
  - **Local**: 2-4 players on same device
  - **Online**: Room-based multiplayer via Socket.io — create/join with 6-char code, host starts game, each player sees only their own cards, actions shown as toast notifications + action feed
- **Game Features**:
  - 25 Region (Bölge) cards, 55 Material (Malzeme) cards, 20 Event (Olay) cards
  - Turn-based gameplay: draw → match materials → complete regions → score points
  - Event cards with special actions (skip turn, steal, reshuffle, etc.)
  - Fixed: "Asi Nehri Taştı" now collects all cards (hand + draw + discard) before reshuffling
  - Animated card interactions (Framer Motion)
  - Victory at 50 points
- **Key Files**:
  - `src/data/cards.ts` — All card data and deck building
  - `src/store/gameStore.ts` — Zustand local game state
  - `src/store/onlineStore.ts` — Zustand online game state (Socket.io)
  - `src/App.tsx` — Mode routing (select/local/online)
  - `src/pages/SetupPage.tsx` — Local player setup
  - `src/pages/GamePage.tsx` — Local game board
  - `src/pages/LobbyPage.tsx` — Online lobby (create/join/waiting room)
  - `src/pages/OnlineGamePage.tsx` — Online game board
  - `src/pages/OnlineGameOverPage.tsx` — Online end screen
  - `src/components/GameCard.tsx` — Card component

### `artifacts/api-server` — Express API + Socket.io Server

Real-time game server for online multiplayer with PostgreSQL persistence.

- **Port**: 8080 (development), path `/api`
- **Socket.io path**: `/api/socket.io`
- **Tech**: Express 5, Socket.io 4, PostgreSQL (`@workspace/db`)
- **DB Persistence**: All room state is saved to PostgreSQL `game_rooms` table after every action. On reconnect, room is loaded from DB if not in memory. Completed games are deleted from DB 60 seconds after game_over.
- **Key Files**:
  - `src/game/roomManager.ts` — Room creation, game logic, player views; `restoreRoomFromDb` for DB recovery
  - `src/game/socketHandler.ts` — Socket event handlers; saves to DB after every mutation
  - `src/game/db.ts` — DB functions: `saveRoom`, `loadRoom`, `deleteRoom`, `initDb`
  - `src/game/cards.ts` — Server-side card data
  - `src/index.ts` — HTTP server + Socket.io setup + DB init

## Online Multiplayer Persistence

- Game state is stored in `game_rooms (room_code TEXT PK, host_socket_id TEXT, state JSONB, created_at, updated_at)`
- After every game action (draw, complete, event, etc.), state is upserted to DB asynchronously
- On `rejoin_room`, if room not in memory, it's loaded from DB and restored (stale socketIds get updated when players reconnect)
- URL-based rooms: after joining/creating, URL is updated to `?room=CODE`; opening this URL auto-routes to online mode and attempts rejoin
- Completed games (phase=game_over) are deleted from DB 60 seconds after game over
- localStorage still used for player name + room code session (fallback if URL is lost)

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
