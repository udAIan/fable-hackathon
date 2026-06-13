import type { Request, Response } from "express";
import { Sandbox, type CommandHandle } from "e2b";
import { and, eq, isNull } from "drizzle-orm";
import { db, studioProjectSessions } from "../../db/client";
import { env } from "../../env";
import { STUDIO_SANDBOX_TIMEOUT_MS } from "../../constants";
import { runClaudeChat } from "../../claude";
import type {
  ErrorResponse,
  InterruptStudioChatResponse,
  StudioChatRequest,
  StudioChatStreamEvent,
} from "../../types";
import { getActiveStudioProjectSession } from "./sessions";

type ActiveChatCommand = {
  handle: CommandHandle | null;
  interrupted: boolean;
};

// Per-project serialization so a project only ever has one agent run at a time,
// plus a handle registry so /interrupt (and client disconnects) can stop a run.
const chatQueues = new Map<string, Promise<unknown>>();
const activeChatCommands = new Map<string, ActiveChatCommand>();

export const studioProjectChat = async (
  req: Request<{ projectId: string }, unknown, StudioChatRequest>,
  res: Response<StudioChatStreamEvent | ErrorResponse>,
) => {
  const { projectId } = req.params;
  const message =
    typeof req.body.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    return res
      .status(400)
      .json({ error: "Bad Request", message: "Message is required" });
  }

  return runQueued(projectId, async () => {
    const session = await getActiveStudioProjectSession(projectId);

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

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const active: ActiveChatCommand = { handle: null, interrupted: false };
    activeChatCommands.set(projectId, active);
    let ended = false;

    const write = (event: StudioChatStreamEvent) => {
      if (res.writableEnded || res.destroyed) return;
      res.write(`${JSON.stringify(event)}\n`);
    };
    const end = () => {
      ended = true;
      res.end();
    };

    res.on("close", () => {
      if (ended || active.interrupted || !active.handle) return;
      active.interrupted = true;
      void active.handle.kill().catch(() => undefined);
    });

    try {
      const { sessionId, finalText } = await runClaudeChat({
        sandbox,
        prompt: message,
        model: env.STUDIO_AGENT_MODEL,
        resumeSessionId: session.claudeSessionId,
        anthropicApiKey: env.ANTHROPIC_API_KEY,
        onEvent: write,
        onHandle: handle => {
          active.handle = handle;
        },
      });

      if (active.interrupted) {
        write({ type: "interrupted" });
        return end();
      }

      if (!finalText) {
        write({ type: "error", message: "The agent returned an empty response" });
        return end();
      }

      write({ type: "assistant", text: finalText });

      // First run on this session — record Claude's session id so later turns
      // resume it. The conversation itself lives in the sandbox transcript.
      if (!session.claudeSessionId && sessionId) {
        try {
          await db
            .update(studioProjectSessions)
            .set({ claudeSessionId: sessionId })
            .where(
              and(
                eq(studioProjectSessions.sessionId, session.sessionId),
                isNull(studioProjectSessions.claudeSessionId),
              ),
            );
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("failed to persist claude session id", error);
        }
      }

      return end();
    } catch (error) {
      if (active.interrupted) {
        write({ type: "interrupted" });
      } else {
        // eslint-disable-next-line no-console
        console.error("studio chat failed", error);
        write({ type: "error", message: "The agent run failed" });
      }
      return end();
    } finally {
      if (activeChatCommands.get(projectId) === active) {
        activeChatCommands.delete(projectId);
      }
    }
  });
};

export const interruptStudioProjectChat = async (
  req: Request<{ projectId: string }>,
  res: Response<InterruptStudioChatResponse>,
) => {
  const active = activeChatCommands.get(req.params.projectId);

  if (!active?.handle) {
    return res.json({ interrupted: false });
  }

  active.interrupted = true;
  const interrupted = await active.handle.kill().catch(() => false);

  return res.json({ interrupted });
};

const runQueued = async <T>(projectId: string, task: () => Promise<T>) => {
  const previous = chatQueues.get(projectId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  chatQueues.set(projectId, current);

  try {
    return await current;
  } finally {
    if (chatQueues.get(projectId) === current) {
      chatQueues.delete(projectId);
    }
  }
};
