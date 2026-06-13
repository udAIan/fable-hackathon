import { randomUUID } from "node:crypto";
import type { CommandHandle, Sandbox } from "e2b";
import { STUDIO_COMMAND_TIMEOUT_MS, STUDIO_PROJECT_ROOT } from "./constants";
import type { StudioChatStepStatus, StudioChatStreamEvent } from "./types";

export type RunClaudeChatOptions = {
  sandbox: Sandbox;
  prompt: string;
  model: string;
  resumeSessionId: string | null;
  anthropicApiKey: string;
  deepgramApiKey: string;
  onEvent: (event: StudioChatStreamEvent) => void;
  onHandle?: (handle: CommandHandle) => void;
};

export type RunClaudeChatResult = {
  sessionId: string | null;
  finalText: string;
};

// Runs Claude Code headlessly inside the sandbox and translates its
// `stream-json` output into our normalized StudioChatStreamEvent protocol.
export const runClaudeChat = async (
  options: RunClaudeChatOptions,
): Promise<RunClaudeChatResult> => {
  const {
    sandbox,
    prompt,
    model,
    resumeSessionId,
    anthropicApiKey,
    deepgramApiKey,
    onEvent,
  } = options;

  const promptPath = `/tmp/studio-prompt-${randomUUID()}.txt`;
  await sandbox.files.write(promptPath, prompt);

  const command =
    `cd ${shellQuote(STUDIO_PROJECT_ROOT)} && claude --print ` +
    "--output-format stream-json --verbose " +
    `--model ${shellQuote(model)} ` +
    "--dangerously-skip-permissions " +
    (resumeSessionId ? `--resume ${shellQuote(resumeSessionId)} ` : "") +
    `< ${shellQuote(promptPath)}`;

  const parser = createClaudeStreamParser(onEvent);
  let stdoutBuffer = "";
  let stderrBuffer = "";

  const consume = (chunk: string) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) parser.handleLine(line);
      newlineIndex = stdoutBuffer.indexOf("\n");
    }
  };

  try {
    const handle = await sandbox.commands.run(command, {
      background: true,
      envs: {
        ANTHROPIC_API_KEY: anthropicApiKey,
        DEEPGRAM_API_KEY: deepgramApiKey,
      },
      timeoutMs: STUDIO_COMMAND_TIMEOUT_MS,
      onStdout: consume,
      onStderr: chunk => {
        stderrBuffer += chunk;
      },
    });
    options.onHandle?.(handle);

    await handle.wait();

    const finalLine = stdoutBuffer.trim();
    if (finalLine) parser.handleLine(finalLine);
  } catch (error) {
    // The in-sandbox `claude` command died (crash, OOM/SIGKILL, or timeout). Its
    // stderr is the only clue, so surface it before the error propagates. A bare
    // SIGKILL (e.g. OOM) often leaves stderr empty — that absence is itself a hint.
    const stderr = stderrBuffer.trim();
    // eslint-disable-next-line no-console
    console.error(
      `[claude] command failed${stderr ? `\n${stderr.slice(-4000)}` : " (no stderr captured)"}`,
    );
    throw error;
  } finally {
    await sandbox.commands
      .run(`rm -f ${shellQuote(promptPath)}`, { timeoutMs: 15 * 1000 })
      .catch(() => undefined);
  }

  return parser.snapshot();
};

type ClaudeContentBlock = {
  type: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  is_error?: boolean;
};

type ClaudeStreamLine = {
  type: string;
  subtype?: string;
  session_id?: string;
  result?: string;
  message?: { content?: ClaudeContentBlock[] };
};

const createClaudeStreamParser = (
  onEvent: (event: StudioChatStreamEvent) => void,
) => {
  const toolSteps = new Map<string, { label: string; detail?: string }>();
  let sessionId: string | null = null;
  let finalText = "";
  let sessionEmitted = false;

  const handleLine = (line: string) => {
    let event: ClaudeStreamLine;
    try {
      event = JSON.parse(line) as ClaudeStreamLine;
    } catch {
      return;
    }

    if (typeof event.session_id === "string") {
      sessionId = event.session_id;
      if (!sessionEmitted) {
        sessionEmitted = true;
        onEvent({ type: "session", sessionId });
      }
    }

    if (event.type === "assistant") {
      for (const block of event.message?.content ?? []) {
        if (block.type === "tool_use" && typeof block.id === "string") {
          const described = describeToolUse(block.name, block.input);
          toolSteps.set(block.id, described);
          onEvent({
            type: "step",
            id: block.id,
            label: described.label,
            ...(described.detail ? { detail: described.detail } : {}),
            status: "running",
          });
        }
      }
      return;
    }

    if (event.type === "user") {
      for (const block of event.message?.content ?? []) {
        if (
          block.type === "tool_result" &&
          typeof block.tool_use_id === "string"
        ) {
          const described = toolSteps.get(block.tool_use_id);
          const status: StudioChatStepStatus = block.is_error
            ? "failed"
            : "completed";
          onEvent({
            type: "step",
            id: block.tool_use_id,
            label: described?.label ?? "Tool",
            ...(described?.detail ? { detail: described.detail } : {}),
            status,
          });
        }
      }
      return;
    }

    if (event.type === "result" && typeof event.result === "string") {
      finalText = event.result;
    }
  };

  return {
    handleLine,
    snapshot: (): RunClaudeChatResult => ({ sessionId, finalText }),
  };
};

const describeToolUse = (
  name: string | undefined,
  input: unknown,
): { label: string; detail?: string } => {
  const field = (key: string): string | undefined => {
    if (input && typeof input === "object" && key in input) {
      const value = (input as Record<string, unknown>)[key];
      return typeof value === "string" ? value : undefined;
    }
    return undefined;
  };

  if (name === "Bash") {
    return { label: "Running command", detail: truncate(field("command")) };
  }

  const detail = truncate(
    field("file_path") ?? field("pattern") ?? field("query") ?? field("url"),
  );

  return {
    label: name ? `Using ${name}` : "Working",
    ...(detail ? { detail } : {}),
  };
};

const truncate = (value: string | undefined, max = 200) => {
  if (!value) return undefined;
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max)}…` : collapsed;
};

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
