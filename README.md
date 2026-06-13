# Studio

A minimal, public **AI coding-agent studio**. Create a project → it spins up an
isolated [E2B](https://e2b.dev) sandbox → chat with **Claude Code** running inside
that sandbox to build software. This repo is the bare shell: a projects list, a
project workspace with the agent chat, and a placeholder preview panel.

## Architecture

```
apps/web      Vite + React + TanStack Router + React Query + Tailwind/shadcn  (Cloudflare Pages)
apps/server   Express + Drizzle + Postgres + e2b + Claude Code orchestration   (Railway)
              └─ project-scaffold/  minimal Vite app copied into each sandbox (the agent's cwd)
              └─ scripts/build-studio-template.ts  builds the E2B sandbox template
```

- **Types are shared** with zero ceremony: `web` depends on `server` (`workspace:*`)
  and does `import type { … } from "server"`. They're type-only imports, so the web
  bundle never pulls server runtime code.
- **Chat** streams a normalized NDJSON protocol (`session | step | assistant |
  error | interrupted`) from `claude -p --output-format stream-json` running in the
  sandbox. Message history is persisted in Postgres; Claude's own session is resumed
  via `--resume` across turns.

## Prerequisites

- Node 22 + pnpm 10 (`corepack enable`)
- A **Neon** (or any) Postgres database
- An **E2B** account + API key (custom templates enabled)
- An **Anthropic** API key with credit (Claude Code uses it inside the sandbox)

## Setup

```bash
pnpm install

# env files
cp apps/server/.env.example apps/server/.env   # fill DATABASE_URL, E2B_API_KEY, ANTHROPIC_API_KEY
cp apps/web/.env.example apps/web/.env          # VITE_API_URL=http://localhost:3001

# one-time: build the E2B sandbox template (ships Node + pnpm + Claude Code)
pnpm build:studio-template

# create the database tables (Drizzle)
pnpm db:generate     # generate the migration from src/db/schema.ts
pnpm db:migrate      # apply it to DATABASE_URL

# run both apps (server :3001, web :5173)
pnpm dev
```

Open http://localhost:5173, create a project (this provisions a sandbox — give it a
few seconds), then chat with the agent.

## Manual / one-off commands

| Command | What it does |
| --- | --- |
| `pnpm build:studio-template` | Builds the `claude-studio` E2B template. Re-run after changing `project-scaffold/` or the template script. Needs `E2B_API_KEY`. |
| `pnpm db:generate` | Generates a Drizzle migration from the schema. |
| `pnpm db:migrate` | Applies migrations to `DATABASE_URL`. |
| `pnpm build` | Typechecks the server and builds the web bundle. |

## Deployment

- **Server → Railway.** Build `pnpm install --frozen-lockfile`, start
  `pnpm --filter server start`. Set `DATABASE_URL`, `E2B_API_KEY`,
  `ANTHROPIC_API_KEY`, `STUDIO_AGENT_MODEL`, and `WEB_ORIGIN` (your Pages URL).
  Railway injects `PORT`. Run `pnpm db:migrate` once against Neon.
  **Keep it to a single instance** — the chat queue / interrupt state is in-memory.
- **Web → Cloudflare Pages.** Build `pnpm install && pnpm --filter web build`,
  output `apps/web/dist`. Set `VITE_API_URL` to the Railway URL.
  `public/_redirects` handles SPA deep links.

## What's a placeholder

The right-hand **Preview** panel is intentionally a placeholder. The sandbox already
runs a Vite app (`project-scaffold`) on port 5175, so wiring a live preview iframe is
the natural next step. Files browser, auth, orgs, and multi-session were removed from
the original feature to keep this a clean shell.

## Project structure

```
apps/
  server/
    src/
      index.ts                 Express app
      db/{schema,client}.ts     Drizzle schema + pool
      claude.ts                 Claude Code runner + stream-json → normalized events
      routes/projects/*         list / create / get / messages / chat / interrupt
      types.ts, exported-types.ts
    scripts/build-studio-template.ts
    project-scaffold/           copied into the sandbox at /home/user/project
  web/
    src/
      router.tsx                TanStack Router (list + detail)
      api/*                     React Query hooks + axios client
      routes/*                  projects list, create dialog, project detail, chat panel
      components/ui/*           shadcn components
```
