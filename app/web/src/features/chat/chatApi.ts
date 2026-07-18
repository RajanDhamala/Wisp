import { API_BASE_URL } from "@/Utils/ApiConfig";
import {
  MAX_EVENT_STREAM_BLOCK_CHARACTERS,
  SESSION_PAGE_SIZE,
} from "./chatConstants";
import type {
  ApiEnvelope,
  SessionPage,
  SessionPageResponse,
} from "./chatTypes";
import { normalizeSession } from "./chatUtils";

export const sessionQueryKeys = {
  all: ["sessions"] as const,
  lists: ["sessions", "list"] as const,
  list: (projectId: string | null) =>
    ["sessions", "list", { projectId }] as const,
  searches: ["sessions", "search"] as const,
  search: (search: string) => ["sessions", "search", search] as const,
  detail: (sessionId: string) =>
    ["sessions", "detail", sessionId] as const,
  models: ["session-models"] as const,
};

export const projectQueryKeys = {
  all: ["projects"] as const,
};

export const libraryQueryKeys = {
  responses: ["library", "responses"] as const,
};

export const readResponseError = async (response: Response) => {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;

  if (response.status === 401) {
    window.location.assign("/login");
  }

  return body?.message || `Request failed with status ${response.status}`;
};

export const apiRequest = async <T,>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await readResponseError(response));
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
};

export const fetchSessionPage = async ({
  cursor,
  projectId,
  search,
  signal,
}: {
  cursor?: string | null;
  projectId?: string | null;
  search?: string;
  signal?: AbortSignal;
}): Promise<SessionPage> => {
  const params = new URLSearchParams({ limit: String(SESSION_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  if (projectId) params.set("projectId", projectId);
  if (search) params.set("search", search);

  const page = await apiRequest<SessionPageResponse>(
    `/session?${params.toString()}`,
    { signal },
  );

  return {
    items: page.items.map((session) => normalizeSession(session, [])),
    nextCursor: page.nextCursor,
  };
};

export const consumeEventStream = async (
  response: Response,
  onEvent: (event: string, data: unknown) => void,
) => {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The server returned an empty response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  const consumeBlock = (block: string) => {
    if (block.length > MAX_EVENT_STREAM_BLOCK_CHARACTERS) {
      throw new Error("The server returned an oversized stream event");
    }

    let event = "message";
    const dataLines: string[] = [];

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }

    if (!dataLines.length) return;
    onEvent(event, JSON.parse(dataLines.join("\n")));
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      if (buffer.length > MAX_EVENT_STREAM_BLOCK_CHARACTERS) {
        throw new Error("The server returned an oversized stream event");
      }
      blocks.forEach(consumeBlock);

      if (done) {
        if (buffer.trim()) consumeBlock(buffer);
        break;
      }
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
};

export const getEventString = (data: unknown, key: string) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
};
