import type { Request, Response } from "express";
import { Sandbox } from "e2b";
import { env } from "../../env";
import { STUDIO_SANDBOX_TIMEOUT_MS } from "../../constants";
import type {
  ListStudioChatMessagesResponse,
  StudioChatMessage,
} from "../../types";
import { getActiveStudioProjectSession } from "./sessions";

export const listStudioProjectMessages = async (
  req: Request<{ projectId: string }>,
  res: Response<ListStudioChatMessagesResponse>,
) => {
  const { projectId } = req.params;
  const session = await getActiveStudioProjectSession(projectId);

  // No agent run yet → no transcript → empty history.
  if (!session?.claudeSessionId) {
    return res.json([]);
  }

  const sandbox = await Sandbox.connect(session.e2bSandboxId, {
    apiKey: env.E2B_API_KEY,
    timeoutMs: STUDIO_SANDBOX_TIMEOUT_MS,
  });
  await sandbox.setTimeout(STUDIO_SANDBOX_TIMEOUT_MS);

  const transcript = await readClaudeTranscript(
    sandbox,
    session.claudeSessionId,
  );

  return res.json(transcript);
};

// Claude Code persists each conversation as a JSONL transcript under this dir,
// in a subfolder derived from the agent's cwd. We locate it by session id
// rather than reconstructing the munged path.
const CLAUDE_PROJECTS_DIR = "/home/user/.claude/projects";

const readClaudeTranscript = async (
  sandbox: Sandbox,
  claudeSessionId: string,
): Promise<StudioChatMessage[]> => {
  const transcriptFile = shellQuote(`${claudeSessionId}.jsonl`);
  const command =
    `f=$(find ${CLAUDE_PROJECTS_DIR} -name ${transcriptFile} 2>/dev/null | head -1); ` +
    'if [ -n "$f" ]; then cat "$f"; fi';

  const result = await sandbox.commands.run(command, { timeoutMs: 30 * 1000 });

  return parseClaudeTranscript(result.stdout);
};

type ClaudeContentBlock = {
  type: string;
  text?: string;
};

type ClaudeTranscriptLine = {
  type?: string;
  uuid?: string;
  timestamp?: string;
  isSidechain?: boolean;
  message?: {
    role?: string;
    content?: string | ClaudeContentBlock[];
  };
};

const parseClaudeTranscript = (raw: string): StudioChatMessage[] => {
  const messages: StudioChatMessage[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry: ClaudeTranscriptLine;
    try {
      entry = JSON.parse(trimmed) as ClaudeTranscriptLine;
    } catch {
      continue;
    }

    if (entry.isSidechain) continue;

    const role =
      entry.type === "user" && entry.message?.role === "user"
        ? "user"
        : entry.type === "assistant" && entry.message?.role === "assistant"
          ? "assistant"
          : null;
    if (!role) continue;

    const content = transcriptText(entry.message?.content);
    if (!content) continue;

    messages.push({
      id: entry.uuid ?? `${role}-${messages.length}`,
      role,
      content,
      createdAt: entry.timestamp ?? new Date().toISOString(),
    });
  }

  return messages;
};

const transcriptText = (
  content: string | ClaudeContentBlock[] | undefined,
): string => {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map(block =>
      block.type === "text" && typeof block.text === "string"
        ? block.text.trim()
        : "",
    )
    .filter(Boolean)
    .join("\n\n");
};

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
