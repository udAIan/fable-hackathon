import type { Request, Response } from "express";
import { Sandbox } from "e2b";
import { env } from "../../env";
import {
  STUDIO_APP_DIR,
  STUDIO_PREVIEW_PORT,
  STUDIO_SANDBOX_TIMEOUT_MS,
} from "../../constants";
import type {
  ErrorResponse,
  GetStudioProjectPreviewResponse,
} from "../../types";
import { getActiveStudioProjectSession } from "./sessions";

export const getStudioProjectPreview = async (
  req: Request<{ projectId: string }>,
  res: Response<GetStudioProjectPreviewResponse | ErrorResponse>,
) => {
  const session = await getActiveStudioProjectSession(req.params.projectId);

  if (!session) {
    return res
      .status(404)
      .json({ error: "Not Found", message: "Studio project not found" });
  }

  const sandbox = await Sandbox.connect(session.e2bSandboxId, {
    apiKey: env.E2B_API_KEY,
    timeoutMs: STUDIO_SANDBOX_TIMEOUT_MS,
  });
  await sandbox.setTimeout(STUDIO_SANDBOX_TIMEOUT_MS);

  await ensureDevServer(sandbox);

  return res.json({ url: `https://${sandbox.getHost(STUDIO_PREVIEW_PORT)}` });
};

// Starts the Vite dev server in the app dir unless it's already listening.
// Idempotent: safe to call on every preview load, and restarts the server if a
// pause/resume lost it.
const ensureDevServer = async (sandbox: Sandbox) => {
  if (await isPortUp(sandbox)) return;

  await sandbox.commands.run(
    `cd ${STUDIO_APP_DIR} && pnpm dev > /tmp/vite.log 2>&1`,
    { background: true, timeoutMs: STUDIO_SANDBOX_TIMEOUT_MS },
  );

  // Give Vite a few seconds to boot; return best-effort if it's slow — the
  // preview iframe can be reloaded.
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await isPortUp(sandbox)) return;
  }
};

const isPortUp = (sandbox: Sandbox) =>
  sandbox.commands
    .run(`curl -sf -o /dev/null http://localhost:${STUDIO_PREVIEW_PORT}`, {
      timeoutMs: 5000,
    })
    .then(() => true)
    .catch(() => false);
