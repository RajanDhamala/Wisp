import { useEffect, useState } from "react";
import {
  SENSITIVE_ATTACHMENT_NAMES,
  TEXT_FILE_EXTENSIONS,
} from "./chatConstants";
import type {
  ApiMessage,
  Chat,
  Message,
  Role,
  SessionGroup,
  SessionSummary,
} from "./chatTypes";

export const groupSession = (updatedAt: string): SessionGroup => {
  const now = new Date();
  const updated = new Date(updatedAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const updatedDay = new Date(
    updated.getFullYear(),
    updated.getMonth(),
    updated.getDate(),
  );
  const daysAgo = Math.floor(
    (today.getTime() - updatedDay.getTime()) / 86_400_000,
  );

  if (daysAgo <= 0) return "Today";
  if (daysAgo <= 7) return "Previous 7 days";
  if (daysAgo <= 30) return "Previous 30 days";
  return "Older";
};

export const normalizeMessage = (message: ApiMessage): Message => ({
  ...message,
  role: message.role.toLowerCase() as Role,
});

export const normalizeSession = (
  session: SessionSummary,
  messages: Message[] = [],
): Chat => ({
  id: session.id,
  title: session.title,
  projectId: session.projectId ?? null,
  group: groupSession(session.updatedAt),
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  messageCount: session.messageCount ?? messages.length,
  messages,
  activeGeneration: session.activeGeneration ?? null,
});

export const isUnusedNewChat = (chat: Chat) =>
  chat.title === "New chat" &&
  chat.messageCount === 0 &&
  chat.messages.length === 0 &&
  !chat.activeGeneration;

export const sortSessions = (sessions: Chat[]) =>
  [...sessions].sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() -
      new Date(first.updatedAt).getTime(),
  );

export const isSupportedTextFile = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type.startsWith("text/") || TEXT_FILE_EXTENSIONS.has(extension);
};

export const isSensitiveAttachment = (file: File) =>
  SENSITIVE_ATTACHMENT_NAMES.some((pattern) => pattern.test(file.name));

export const formatFileSize = (bytes: number) =>
  bytes < 1_000 ? `${bytes} B` : `${Math.ceil(bytes / 1_000)} KB`;

export const useDebouncedValue = <Value,>(value: Value, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
};

export const formatResponseTime = (
  createdAt: string | undefined,
  now: number,
) => {
  if (!createdAt) return null;

  const created = new Date(createdAt);
  const createdTime = created.getTime();
  if (Number.isNaN(createdTime)) return null;

  const elapsed = Math.max(0, now - createdTime);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    ...(created.getFullYear() !== new Date(now).getFullYear()
      ? { year: "numeric" }
      : {}),
  }).format(created);
};

export const isAwaitingPersistedAssistant = (chat?: Chat | null) =>
  Boolean(chat?.activeGeneration);
