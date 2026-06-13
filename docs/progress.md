# Studio — progress

_Last updated: 2026-06-13_

An agent for ad-hoc **video-production** work. You chat with a coding agent running in a
sandbox; it does the work (generates/edits media, writes throwaway code) and builds UI on the
fly to present results and let you interact.

## The core bet

The **sandbox filesystem is the data model**, and **Claude owns both the data and the UI**.
There is deliberately **no domain DB schema** for media/assets — the agent organizes the
filesystem and writes ad-hoc React UI as the work demands. Postgres only maps one project → one
E2B sandbox (plus a nullable `claudeSessionId` for `--resume`). The product is built by
*skilling* the agent (workflows + UX principles), not by modeling a high-entropy domain.

## Architecture

- **Monorepo (pnpm).** `apps/web` (Vite + React 19 + TanStack Query/Router + Zustand + axios +
  sonner). `apps/server` (Express 5 + Drizzle + Postgres + E2B SDK). Shared types flow web←server
  via the `server` workspace dep.
- **Chat** = Claude Code headless inside the sandbox (`claude --print --output-format
  stream-json`), parsed into a normalized NDJSON event protocol (`session | step | assistant |
  error | interrupted`) streamed to the browser. Runs are serialized per project and
  interruptible.
- **Chat history** isn't stored in Postgres — it's reconstructed from Claude Code's JSONL
  transcript inside the sandbox, located by `claudeSessionId`.

### Sandbox layout (Layout B)

```
/home/user/            workspace = agent cwd (STUDIO_PROJECT_ROOT)
├── CLAUDE.md          static operating manual (the skilling)
├── STATE.md           dynamic per-project state the agent maintains
├── media/             generated/served media  (→ app/public/media symlink)
├── scripts/           ephemeral agent code, incl. local ffmpeg            [later]
├── tools/             thin proxy clients → our server's gen API, NO keys  [later]
└── app/               Vite preview app — own package root = HMR boundary
    └── public/media -> ../../media   (symlink, created at template build)
```

The app lives in its own subdir so Vite's HMR watcher is scoped to `app/` and never sees the
`.claude/` transcript churn or `node_modules`.

### The only "structure" (thin plumbing contracts, not domain modeling)

- **Media:** anything under `public/media/` is fetchable in the preview at `/media/...`.
- **View:** the agent overwrites `app/src/App.tsx` to show whatever is most relevant now — a live
  canvas, not an accumulating page. History lives in `media/` + the conversation.
- **State:** `STATE.md` is the agent's durable orientation across sessions. A fresh agent reads
  `CLAUDE.md` for *how to operate* and `STATE.md` for *where this project is*.

### Tool / key boundary (deferred, but decided)

- **Cheap local work** (ffmpeg, image ops, file munging) runs **in the sandbox**; the agent runs
  it freely.
- **Paid generation** (nanobanana = Gemini image, seedance = ByteDance video, …) runs on **our
  server** — keys never enter the sandbox. The agent **cannot** fire it; it builds UI buttons and
  the **user** clicks. The server runs the gen and delivers media back into the sandbox.
- Sandbox identity for that wiring: `E2B_SANDBOX_ID` env var + the 1:1 project↔sandbox map.

### Sandbox specs

4 vCPU / 8 GB, set at E2B template build time (inherited by every sandbox; not a per-create
option).

## Checkpoint 1 — live preview loop ✅

Goal: chat edits the in-sandbox app → it updates live in an iframe → the previewed app is
interactive → web state is coherent.

- **Sandbox** restructured to Layout B; template `claude-studio` rebuilt (esbuild postinstall
  enabled so Vite can start; 4 vCPU / 8 GB).
- **Server:** `ensureDevServer` (idempotent Vite boot on :5175, survives pause/resume) +
  `GET /api/projects/:id/preview` → `{ url: "https://" + getHost(5175) }`.
- **Web:** `usePreview` hook, `PreviewPane` (iframe keyed by a refresh counter, reload button),
  Zustand `workspace` store; chat fires `refreshPreview()` when a turn settles (HMR safety net).
- **HMR over the E2B https proxy** works via `server.hmr.clientPort = 443` in the scaffold's
  `vite.config.ts`.

**Status:** confirmed working — UI built via chat rendered live in the iframe.

## Demo pipeline — video lip-sync fix ✅ (built)

Use case: a clip with AI-generated audio whose **on-screen** speaker's lips don't match (an
off-screen interviewer also talks). Fix the lip-sync for only the on-screen speaker's segments.

Flow (agent orchestrates; only lip-sync is paid + user-fired):
1. **Upload** the clip via the chat box → `/home/user/inputs/`.
2. **Analyze (local/cheap):** agent extracts audio (ffmpeg), runs **Deepgram diarization**
   (`DEEPGRAM_API_KEY` lives in the sandbox), IDs the on-screen speaker (frame check → user
   confirms), cuts her segments to `media/segments/<id>.{mp4,wav}`.
3. **Lip-sync (paid, server-side, user-fired):** agent builds a button in the preview → user
   clicks → `POST /api/projects/:id/lipsync` → server submits one `fal-ai/sync-lipsync/v2` job per
   segment (`FAL_KEY` server-side), writes request ids to `media/lipsync.json`. The preview
   **polls `GET …/lipsync`**; the server delivers each corrected clip to
   `media/lipsynced/<id>.mp4` on completion.
4. **Stitch (local/cheap):** agent concats the corrected clips back over the originals → final
   video in the preview.

Key decisions: **N short jobs** (one per segment), **fal queue + poll** (never block),
**request ids live in the sandbox** (`media/lipsync.json`, not a DB), the **sandbox polls** our
server (server proxies fal). Cheap analysis key (Deepgram) sits *in* the sandbox; only the
expensive gen key (fal) is server-side + user-triggered. Preview→server identity via injected
`VITE_STUDIO_PROJECT_ID` / `VITE_STUDIO_API_URL` + `*.e2b.app` CORS.

## Known issues / in flight

- An agent turn died with `SandboxError: 2: [unknown] terminated` — the in-sandbox `claude`
  process was killed by a signal (not our interrupt path). Leading suspect: **OOM on a pre-8 GB
  sandbox** (it built the UI, then died late). Added stderr capture + logging in `claude.ts` to
  stop guessing; verifying on fresh 8 GB projects.

## Key files

| Area | File |
| --- | --- |
| E2B template (layout, deps, specs) | `apps/server/scripts/build-studio-template.ts` |
| What ships into each sandbox | `apps/server/project-scaffold/` (`CLAUDE.md`, `STATE.md`, `app/`) |
| Sandbox paths/port constants | `apps/server/src/constants.ts` |
| Headless claude run + stream parse | `apps/server/src/claude.ts` |
| Preview endpoint + dev-server boot | `apps/server/src/routes/projects/preview.ts` |
| Chat streaming / queue / interrupt | `apps/server/src/routes/projects/chat.ts` |
| Preview pane / chat / layout | `apps/web/src/routes/{preview-pane,chat-panel,project-detail}.tsx` |
| Shared UI state | `apps/web/src/store/workspace.ts` |

## Next (deferred)

- **Tool/gen mechanics:** button (in the sandbox preview) → our server → run gen → deliver media
  into the sandbox. Resolve the trigger path + identity, and async jobs (video gen is slow) with
  loading states.
- **Skills:** video-production workflows + UX principles that make the agent useful.
- **Refinement:** only reload the preview when `app/` files actually changed (currently every
  turn — a harmless flash on text-only replies).
