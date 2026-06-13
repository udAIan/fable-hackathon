import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Loader2, Square, X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { StudioChatMessage } from "server";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  useInterruptChat,
  useListMessages,
  useSendChatMessage,
} from "../api/chat";

type ChatStep = {
  id: string;
  label: string;
  detail?: string;
  status: "running" | "completed" | "failed";
};

type StreamingTurn = {
  userText: string;
  assistantText: string;
  steps: ChatStep[];
  status: "running" | "interrupted";
};

export const ChatPanel = ({ projectId }: { projectId: string }) => {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<StudioChatMessage[]>([]);
  const [turn, setTurn] = useState<StreamingTurn | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data: loadedMessages, isPending } = useListMessages(projectId);
  const sendMessage = useSendChatMessage();
  const interruptChat = useInterruptChat();
  const sending = sendMessage.isPending;

  useEffect(() => {
    if (loadedMessages) setMessages(loadedMessages);
  }, [loadedMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, turn]);

  useEffect(() => {
    if (!sending) return;
    setElapsed(0);
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [sending]);

  const submit = () => {
    const message = draft.trim();
    if (!message || sending || isPending) return;

    setDraft("");
    setTurn({ userText: message, assistantText: "", steps: [], status: "running" });

    sendMessage.mutate(
      {
        projectId,
        message,
        onEvent: event => {
          if (event.type === "assistant") {
            setTurn(current =>
              current ? { ...current, assistantText: event.text } : current,
            );
          } else if (event.type === "interrupted") {
            setTurn(current =>
              current ? { ...current, status: "interrupted" } : current,
            );
          } else if (event.type === "step") {
            const step: ChatStep = {
              id: event.id,
              label: event.label,
              detail: event.detail,
              status: event.status,
            };
            setTurn(current => {
              if (!current || current.assistantText) return current;
              return { ...current, steps: upsertStep(current.steps, step) };
            });
          }
        },
      },
      {
        onSuccess: ({ content }) => {
          setTurn(null);
          if (content) {
            const now = new Date().toISOString();
            setMessages(current => [
              ...current,
              {
                id: `local-user-${Date.now()}`,
                role: "user",
                content: message,
                createdAt: now,
              },
              {
                id: `local-assistant-${Date.now()}`,
                role: "assistant",
                content,
                createdAt: now,
              },
            ]);
          }
        },
        onError: () => {
          setTurn(null);
          setDraft(message);
        },
      },
    );
  };

  const showEmptyState =
    !isPending && messages.length === 0 && !turn;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {isPending ? (
            <Centered>
              <Loader2 className="size-4 animate-spin" />
              Loading messages…
            </Centered>
          ) : null}

          {showEmptyState ? (
            <Centered>
              No messages yet. Ask the agent to build something.
            </Centered>
          ) : null}

          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {turn ? <StreamingTurnView turn={turn} elapsed={elapsed} /> : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pb-4">
        <div className="rounded-lg border border-input bg-background p-3">
          <Textarea
            value={draft}
            placeholder="Message the agent…"
            disabled={isPending}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            className="max-h-40 min-h-8 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
          />
          <div className="flex justify-end pt-1">
            {sending ? (
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="Stop"
                disabled={interruptChat.isPending}
                onClick={() => interruptChat.mutate({ projectId })}
              >
                <Square className="size-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="size-8"
                aria-label="Send"
                disabled={!draft.trim() || isPending}
                onClick={submit}
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageBubble = ({ message }: { message: StudioChatMessage }) => {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-muted px-4 py-2.5 text-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none">
      <AssistantMarkdown content={message.content} />
    </div>
  );
};

const StreamingTurnView = ({
  turn,
  elapsed,
}: {
  turn: StreamingTurn;
  elapsed: number;
}) => (
  <>
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-muted px-4 py-2.5 text-sm">
        <p className="whitespace-pre-wrap">{turn.userText}</p>
      </div>
    </div>

    <div className="rounded-lg bg-muted/50 p-3">
      {turn.assistantText ? (
        <div className="prose prose-sm max-w-none">
          <AssistantMarkdown content={turn.assistantText} />
        </div>
      ) : turn.status === "interrupted" ? (
        <div className="text-sm text-muted-foreground">Stopped.</div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3 text-muted-foreground">
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Working…
            </span>
            <span className="tabular-nums">{formatElapsed(elapsed)}</span>
          </div>
          {turn.steps.length > 0 ? (
            <div className="rounded-md border border-border bg-muted/30 p-2">
              {turn.steps.map(step => (
                <StepRow key={step.id} step={step} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  </>
);

const StepRow = ({ step }: { step: ChatStep }) => (
  <div className="flex min-h-7 items-start gap-2 py-1">
    {step.status === "running" ? (
      <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-muted-foreground" />
    ) : step.status === "failed" ? (
      <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
    ) : (
      <Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
    )}
    <div className="min-w-0">
      <div className="truncate text-foreground">{step.label}</div>
      {step.detail ? (
        <div className="truncate text-xs text-muted-foreground">
          {step.detail}
        </div>
      ) : null}
    </div>
  </div>
);

const AssistantMarkdown = ({ content }: { content: string }) => (
  <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
);

const Centered = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-32 items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

const upsertStep = (steps: ChatStep[], next: ChatStep) => {
  const index = steps.findIndex(step => step.id === next.id);
  if (index < 0) return [...steps, next];
  const updated = [...steps];
  updated[index] = next;
  return updated;
};

const formatElapsed = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${(seconds % 60).toString().padStart(2, "0")}s`;
};
