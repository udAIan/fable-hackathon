import type { Request, Response } from "express";
import multer from "multer";
import { Sandbox } from "e2b";
import { env } from "../../env";
import { STUDIO_INPUTS_DIR, STUDIO_SANDBOX_TIMEOUT_MS } from "../../constants";
import type {
  ErrorResponse,
  UploadStudioInputsResponse,
  UploadedStudioInput,
} from "../../types";
import { getActiveStudioProjectSession } from "./sessions";

// Buffers uploads in memory (demo-sized files) then writes them into the
// sandbox. The cap keeps a runaway upload from exhausting server memory.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

export const uploadInputsMiddleware = upload.array("files", 10);

export const uploadStudioInputs = async (
  req: Request<{ projectId: string }>,
  res: Response<UploadStudioInputsResponse | ErrorResponse>,
) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  if (files.length === 0) {
    return res
      .status(400)
      .json({ error: "Bad Request", message: "No files uploaded" });
  }

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

  const uploaded: UploadedStudioInput[] = [];
  for (const file of files) {
    const name = safeFileName(file.originalname);
    const path = `${STUDIO_INPUTS_DIR}/${name}`;
    await sandbox.files.write(path, new Blob([file.buffer]));
    uploaded.push({ name, path, url: `/inputs/${name}` });
  }

  return res.json({ files: uploaded });
};

const safeFileName = (name: string) => {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  return cleaned || "file";
};
