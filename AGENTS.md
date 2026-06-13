# AGENTS.md

Read and follow this every session before changing code.

## Mindset — hackathon MVP

This is a one-day hackathon project. Optimize for speed and a working demo, not production robustness or perfection. Quick-and-dirty MVP: ship the simplest thing that works, prefer inline code over abstractions, and skip defensive edge cases, tests, and hardening unless the demo needs them. Don't gold-plate. The one thing we always keep is visible errors (see Error handling) so we can fix fast.

Monorepo (pnpm workspaces):

- `apps/web` — Vite + React 19 + TanStack Query + TanStack Router + axios + sonner.
- `apps/server` — Express 5 + Drizzle + Postgres. Shared types flow into the web app via the `server` workspace dependency.

Run `pnpm lint` (per-package `tsc --noEmit`) before finishing a change.

## Error handling (required)

API errors must always be visible: on a UI toast for the user, in the server logs for debugging. Keep it that way — it is the project's reliability baseline.

**Error response shape.** Server error responses are always `{ error: string, message: string }`. The web app shows `error` as the toast title and `message` as the description, so always set a useful `message`.

### Web — toasts

- Every failed query and mutation surfaces as an error toast automatically. This is wired globally in `apps/web/src/api/client.ts` via TanStack Query's `QueryCache`/`MutationCache` `onError`; `<Toaster>` is mounted in `apps/web/src/main.tsx`.
- Do NOT add a per-call `onError: toast.error(...)`. The global handler already shows the server's message, and a manual one double-toasts.
- A mutation that renders its own error UI opts out with `meta: { skipGlobalErrorToast: true }` (e.g. the streaming chat send in `apps/web/src/api/chat.ts`).

### Server — logging

- Never swallow errors. Let route handlers throw; Express 5 forwards async rejections to the central `errorMiddleware` in `apps/server/src/index.ts`, which logs `method + path + error` and returns a sanitized 500.
- For expected validation failures, return an explicit 4xx `{ error, message }` from the handler.
- Streaming handlers (past `flushHeaders()`) cannot use the error middleware — log with `console.error` and emit a `{ type: "error", message }` stream event.
