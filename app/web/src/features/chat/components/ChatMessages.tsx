import {
  Bookmark,
  Check,
  Copy,
  Ellipsis,
  GitBranch,
  Maximize2,
  Minimize2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Message, ModelOption, ResponseReaction } from "../chatTypes";
import { formatResponseTime } from "../chatUtils";
import { AssistantContent } from "./ChatPreview";
import { IconButton, ModelLogo } from "./ChatPrimitives";

const MessageBubble = memo(function MessageBubble({
  constrainCodeHeight = true,
  hideAvatar = false,
  message,
  onDelete,
  onReactionChange,
  onSave,
  reaction,
  saving,
  streaming = false,
  timestampNow,
}: {
  constrainCodeHeight?: boolean;
  hideAvatar?: boolean;
  message: Message;
  onDelete: (message: Message) => void;
  onReactionChange: (messageId: string, reaction: ResponseReaction) => void;
  onSave: (message: Message) => void;
  reaction: ResponseReaction;
  saving: boolean;
  streaming?: boolean;
  timestampNow: number;
}) {
  const [copied, setCopied] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const moreActionsRef = useRef<HTMLDivElement>(null);
  const responseTime = formatResponseTime(message.createdAt, timestampNow);
  const exactResponseTime =
    responseTime && message.createdAt
      ? new Date(message.createdAt).toLocaleString()
      : undefined;

  useEffect(() => {
    if (!moreActionsOpen) return;

    const closeMoreActions = (event: PointerEvent) => {
      if (!moreActionsRef.current?.contains(event.target as Node)) {
        setMoreActionsOpen(false);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMoreActionsOpen(false);
    };

    window.addEventListener("pointerdown", closeMoreActions);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeMoreActions);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreActionsOpen]);

  const copyMessage = async () => {
    await navigator.clipboard?.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="group max-w-[85%] sm:max-w-[75%]">
          <div className="whitespace-pre-wrap rounded-3xl bg-zinc-100 px-4 py-2.5 text-[15px] leading-6 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
            {message.content}
          </div>
          <div className="mt-1 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
            <IconButton label="Copy message" onClick={copyMessage}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </IconButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      {!hideAvatar && (
        <div className="mb-3 flex size-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
          <ModelLogo
            className="size-4"
            label={message.model ?? "Wisp model"}
            modelId={message.model}
          />
        </div>
      )}
      <div className="break-words text-[15px] leading-7 text-zinc-800 dark:text-zinc-200">
        <AssistantContent
          content={message.content}
          constrainCodeHeight={constrainCodeHeight}
          streaming={streaming}
        />
      </div>
      {!streaming && message.content && (
        <div className="mt-3 flex items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
          <IconButton label="Copy response" onClick={copyMessage}>
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </IconButton>
          <IconButton
            className={
              reaction === "like"
                ? "bg-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100"
                : ""
            }
            label="Good response"
            onClick={() =>
              onReactionChange(
                message.id,
                reaction === "like" ? null : "like",
              )
            }
            pressed={reaction === "like"}
          >
            <ThumbsUp
              className={`size-4 ${reaction === "like" ? "fill-current" : ""}`}
            />
          </IconButton>
          <IconButton
            className={
              reaction === "dislike"
                ? "bg-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100"
                : ""
            }
            label="Bad response"
            onClick={() =>
              onReactionChange(
                message.id,
                reaction === "dislike" ? null : "dislike",
              )
            }
            pressed={reaction === "dislike"}
          >
            <ThumbsDown
              className={`size-4 ${reaction === "dislike" ? "fill-current" : ""}`}
            />
          </IconButton>
          <div
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setMoreActionsOpen(false);
              }
            }}
            ref={moreActionsRef}
          >
            <button
              aria-expanded={moreActionsOpen}
              aria-haspopup="menu"
              aria-label="More actions"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              onClick={() => setMoreActionsOpen((current) => !current)}
              type="button"
            >
              <Ellipsis className="size-4" />
            </button>
            {moreActionsOpen && (
              <div className="absolute bottom-full left-0 z-30 w-44 pb-1">
                <div
                  className="rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                  role="menu"
                >
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    disabled={saving}
                    onClick={() => {
                      setMoreActionsOpen(false);
                      onSave(message);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Bookmark className="size-4" />
                    {saving ? "Saving…" : "Save to library"}
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:text-red-400 dark:hover:bg-red-950/50"
                    onClick={() => {
                      setMoreActionsOpen(false);
                      onDelete(message);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
          {responseTime && (
            <time
              className="ml-1 text-[11px] font-normal text-zinc-500 dark:text-zinc-500"
              dateTime={message.createdAt}
              title={exactResponseTime}
            >
              {responseTime}
            </time>
          )}
        </div>
      )}
    </div>
  );
});

const BranchResponseCard = memo(function BranchResponseCard({
  fullscreen = false,
  label,
  message,
  modelId,
  onDelete,
  onReactionChange,
  onSave,
  onToggleFullscreen,
  reaction,
  saving,
  streaming,
  timestampNow,
}: {
  fullscreen?: boolean;
  label: string;
  message: Message;
  modelId?: string | null;
  onDelete: (message: Message) => void;
  onReactionChange: (messageId: string, reaction: ResponseReaction) => void;
  onSave: (message: Message) => void;
  onToggleFullscreen: (messageId: string | null) => void;
  reaction: ResponseReaction;
  saving: boolean;
  streaming: boolean;
  timestampNow: number;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);

  useEffect(() => {
    if (!streaming || !shouldFollowRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const content = contentRef.current;
      if (content) content.scrollTop = content.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [message.content, streaming]);

  const handleScroll = () => {
    const content = contentRef.current;
    if (!content) return;
    const distanceFromBottom =
      content.scrollHeight - content.scrollTop - content.clientHeight;
    shouldFollowRef.current = distanceFromBottom < 80;
  };

  return (
    <article
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${fullscreen
        ? "h-full rounded-2xl"
        : "h-full w-[min(88vw,26rem)] shrink-0 snap-start rounded-2xl"
        }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <ModelLogo className="size-[18px]" label={label} modelId={modelId} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {label}
            </p>
            {streaming && (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                Responding
              </span>
            )}
          </div>
        </div>
        <IconButton
          label={fullscreen ? `Exit ${label} fullscreen` : `View ${label} fullscreen`}
          onClick={() => onToggleFullscreen(fullscreen ? null : message.id)}
        >
          {fullscreen ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </IconButton>
      </div>
      <div
        className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
        onScroll={handleScroll}
        onWheel={(event) => {
          if (event.deltaY < 0) shouldFollowRef.current = false;
        }}
        ref={contentRef}
      >
        <MessageBubble
          constrainCodeHeight={false}
          hideAvatar
          message={message}
          onDelete={onDelete}
          onReactionChange={onReactionChange}
          onSave={onSave}
          reaction={reaction}
          saving={saving}
          streaming={streaming}
          timestampNow={timestampNow}
        />
      </div>
    </article>
  );
});

const ConversationMessagesComponent = ({
  messages,
  models,
  onDeleteResponse,
  onSaveResponse,
  savingMessageId,
  streamingMessageIds,
}: {
  messages: Message[];
  models: ModelOption[];
  onDeleteResponse: (message: Message) => void;
  onSaveResponse: (message: Message) => void;
  savingMessageId: string | null;
  streamingMessageIds: string[];
}) => {
  const [fullscreenMessageId, setFullscreenMessageId] = useState<string | null>(
    null,
  );
  const [responseReactions, setResponseReactions] = useState<
    Record<string, Exclude<ResponseReaction, null>>
  >({});
  const [timestampNow, setTimestampNow] = useState(() => Date.now());
  const groups = useMemo(
    () =>
      messages.reduce<Message[][]>((current, message) => {
        const previous = current.at(-1);
        if (
          message.role === "assistant" &&
          previous?.every((item) => item.role === "assistant")
        ) {
          previous.push(message);
        } else {
          current.push([message]);
        }
        return current;
      }, []),
    [messages],
  );
  const modelLabels = useMemo(
    () => new Map(models.map((model) => [model.id, model.label])),
    [models],
  );
  const streamingIds = useMemo(
    () => new Set(streamingMessageIds),
    [streamingMessageIds],
  );
  const fullscreenMessage = fullscreenMessageId
    ? (messages.find((message) => message.id === fullscreenMessageId) ?? null)
    : null;
  const getModelLabel = (message: Message) =>
    message.model
      ? (modelLabels.get(message.model) ?? message.model)
      : "Wisp model";
  const updateReaction = useCallback((
    messageId: string,
    reaction: ResponseReaction,
  ) => {
    setResponseReactions((current) => {
      if (reaction) return { ...current, [messageId]: reaction };
      if (!(messageId in current)) return current;
      const next = { ...current };
      delete next[messageId];
      return next;
    });
  }, []);

  useEffect(() => {
    const interval = window.setInterval(
      () => setTimestampNow(Date.now()),
      30_000,
    );
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!fullscreenMessageId) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setFullscreenMessageId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [fullscreenMessageId]);

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-48 pt-8 sm:px-6 sm:pt-12">
        {groups.map((group) => {
          const firstMessage = group[0];
          if (group.length === 1) {
            return (
              <div className="mx-auto w-full max-w-3xl" key={firstMessage.id}>
                <MessageBubble
                  message={firstMessage}
                  onDelete={onDeleteResponse}
                  onReactionChange={updateReaction}
                  onSave={onSaveResponse}
                  reaction={responseReactions[firstMessage.id] ?? null}
                  saving={savingMessageId === firstMessage.id}
                  streaming={streamingIds.has(firstMessage.id)}
                  timestampNow={timestampNow}
                />
              </div>
            );
          }

          const groupIsStreaming = group.some((message) =>
            streamingIds.has(message.id),
          );
          return (
            <section className="w-full" key={group.map(({ id }) => id).join("-")}>
              <div className="mb-3 flex items-center justify-between gap-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-2">
                  <GitBranch className="size-4" />
                  {group.length} model branches
                </span>
                <span className="hidden items-center gap-1.5 sm:flex">
                  {groupIsStreaming && (
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  )}
                  {groupIsStreaming
                    ? "Safe to leave — generation will continue"
                    : "Scroll sideways · each response scrolls independently"}
                </span>
              </div>
              <div
                className="subtle-scrollbar flex h-[58dvh] snap-x snap-mandatory items-stretch gap-3 overflow-x-auto overscroll-x-contain pb-2 lg:h-[calc(100dvh-14.5rem)] lg:min-h-[30rem]"
              >
                {group.map((message) => {
                  const streaming = streamingIds.has(message.id);
                  return (
                    <BranchResponseCard
                      key={message.id}
                      label={getModelLabel(message)}
                      message={message}
                      modelId={message.model}
                      onDelete={onDeleteResponse}
                      onReactionChange={updateReaction}
                      onSave={onSaveResponse}
                      onToggleFullscreen={setFullscreenMessageId}
                      reaction={responseReactions[message.id] ?? null}
                      saving={savingMessageId === message.id}
                      streaming={streaming}
                      timestampNow={timestampNow}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {fullscreenMessage && (
        <div
          aria-label={`${getModelLabel(fullscreenMessage)} fullscreen response`}
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-white p-3 dark:bg-black sm:p-6"
          role="dialog"
        >
          <div className="mx-auto h-full w-full max-w-7xl">
            <BranchResponseCard
              fullscreen
              label={getModelLabel(fullscreenMessage)}
              message={fullscreenMessage}
              modelId={fullscreenMessage.model}
              onDelete={onDeleteResponse}
              onReactionChange={updateReaction}
              onSave={onSaveResponse}
              onToggleFullscreen={setFullscreenMessageId}
              reaction={responseReactions[fullscreenMessage.id] ?? null}
              saving={savingMessageId === fullscreenMessage.id}
              streaming={streamingIds.has(fullscreenMessage.id)}
              timestampNow={timestampNow}
            />
          </div>
        </div>
      )}
    </>
  );
};

export const ConversationMessages = memo(ConversationMessagesComponent);
