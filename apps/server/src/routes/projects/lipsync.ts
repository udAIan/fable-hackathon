import type { Request, Response } from "express";
import { fal } from "@fal-ai/client";
import { Sandbox } from "e2b";
import { env } from "../../env";
import { STUDIO_MEDIA_DIR, STUDIO_SANDBOX_TIMEOUT_MS } from "../../constants";
import type { ErrorResponse } from "../../types";
import { getActiveStudioProjectSession } from "./sessions";

fal.config({ credentials: env.FAL_KEY });

const LIPSYNC_MODEL = "fal-ai/sync-lipsync/v2";
const STATUS_FILE = `${STUDIO_MEDIA_DIR}/lipsync.json`;
const OUTPUT_DIR = `${STUDIO_MEDIA_DIR}/lipsynced`;

type LipsyncSegment = { id: string; video: string; audio: string };

type LipsyncJob = {
  id: string;
  requestId: string;
  status: "pending" | "completed";
  outputPath?: string;
};

type LipsyncBody = { segments?: LipsyncSegment[]; model?: string };
type LipsyncState = { jobs: LipsyncJob[] };

// Starts one lip-sync job per segment. The agent's preview UI calls this on a
// user click — we never start generation on our own. The fal key stays here;
// request ids are written into the sandbox so the agent owns the job state.
export const startLipsync = async (
  req: Request<{ projectId: string }, unknown, LipsyncBody>,
  res: Response<LipsyncState | ErrorResponse>,
) => {
  const session = await getActiveStudioProjectSession(req.params.projectId);
  if (!session) {
    return res
      .status(404)
      .json({ error: "Not Found", message: "Studio project not found" });
  }

  const segments = req.body.segments ?? [];
  if (segments.length === 0) {
    return res
      .status(400)
      .json({ error: "Bad Request", message: "No segments provided" });
  }
  const model = req.body.model === "lipsync-2-pro" ? "lipsync-2-pro" : "lipsync-2";

  const sandbox = await Sandbox.connect(session.e2bSandboxId, {
    apiKey: env.E2B_API_KEY,
    timeoutMs: STUDIO_SANDBOX_TIMEOUT_MS,
  });
  await sandbox.setTimeout(STUDIO_SANDBOX_TIMEOUT_MS);

  const jobs: LipsyncJob[] = [];
  for (const segment of segments) {
    const [video, audio] = await Promise.all([
      sandbox.files.read(resolvePath(segment.video), { format: "blob" }),
      sandbox.files.read(resolvePath(segment.audio), { format: "blob" }),
    ]);
    const [videoUrl, audioUrl] = await Promise.all([
      fal.storage.upload(video),
      fal.storage.upload(audio),
    ]);
    const { request_id } = await fal.queue.submit(LIPSYNC_MODEL, {
      // The installed fal client's types for this endpoint are stale (they list
      // lipsync-1.x); the live API uses lipsync-2 / lipsync-2-pro.
      input: { model, video_url: videoUrl, audio_url: audioUrl } as never,
    });
    jobs.push({ id: segment.id, requestId: request_id, status: "pending" });
  }

  await sandbox.files.write(STATUS_FILE, JSON.stringify({ jobs }, null, 2));
  return res.json({ jobs });
};

// Polled by the sandbox. Checks each pending job on fal; as one completes,
// downloads the corrected clip into the sandbox and marks it done.
export const lipsyncStatus = async (
  req: Request<{ projectId: string }>,
  res: Response<LipsyncState | ErrorResponse>,
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

  const raw = await sandbox.files
    .read(STATUS_FILE, { format: "text" })
    .catch(() => null);
  if (!raw) return res.json({ jobs: [] });

  const state = JSON.parse(raw) as LipsyncState;
  let changed = false;

  for (const job of state.jobs) {
    if (job.status === "completed") continue;

    const { status } = await fal.queue.status(LIPSYNC_MODEL, {
      requestId: job.requestId,
    });
    if (status !== "COMPLETED") continue;

    const result = await fal.queue.result(LIPSYNC_MODEL, {
      requestId: job.requestId,
    });
    const url = (result.data as { video?: { url?: string } }).video?.url;
    if (!url) continue;

    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    const outputPath = `${OUTPUT_DIR}/${job.id}.mp4`;
    await sandbox.files.write(outputPath, new Blob([bytes]));
    job.status = "completed";
    job.outputPath = outputPath;
    changed = true;
  }

  if (changed) {
    await sandbox.files.write(STATUS_FILE, JSON.stringify(state, null, 2));
  }
  return res.json(state);
};

const resolvePath = (path: string) =>
  path.startsWith("/") ? path : `/home/user/${path}`;
