# Hatay Gastronomi Rotası

Card game based on Hatay cuisine. Supports local and online multiplayer.

## Prerequisites

- Node.js 18+
- pnpm (install with `npm install -g pnpm`)

## Setup

```bash
pnpm install
```

## Development

Run all services:

```bash
pnpm dev
```

This starts:
- **API Server**: `http://localhost:8080` (Socket.io on `/api/socket.io`)
- **Frontend**: `http://localhost:25740`
- **Component Preview**: `http://localhost:<port>` (if needed)

## Project Structure

```
artifacts/
├── api-server/          # Node.js backend (Express + Socket.io)
├── hatay-gastronomi/    # React frontend (Vite)
└── mockup-sandbox/      # Component preview (optional)
```

## Build for Production

```bash
pnpm build
```

## Key Environment

- Frontend connects to API via Socket.io at `/api/socket.io`
- API listens on `PORT=8080`
- Frontend runs on `PORT=25740` (configurable)

## Notes

- Local game works without backend
- Online multiplayer requires both API server and frontend running
- Game state persists in localStorage
