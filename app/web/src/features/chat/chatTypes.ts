import type { InfiniteData } from "@tanstack/react-query";

export type Role = "user" | "assistant" | "system";
export type ResponseReaction = "like" | "dislike" | null;
export type SessionGroup =
  | "Today"
  | "Previous 7 days"
  | "Previous 30 days"
  | "Older";
export type ChatMode = "normal" | "branching";
export type ChatDialog = "search" | "library" | null;
export type GenerationBranchStatus = "streaming" | "complete" | "error";

export type ActiveGeneration = {
  id: string;
  mode: ChatMode;
  models: string[];
  startedAt: string;
  branches: Array<{
    model: string;
    content: string;
    status: GenerationBranchStatus;
  }>;
};

export type Message = {
  id: string;
  role: Role;
  content: string;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  totalTokens?: number;
  createdAt?: string;
};

export type Chat = {
  id: string;
  title: string;
  projectId: string | null;
  group: SessionGroup;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages: Message[];
  activeGeneration: ActiveGeneration | null;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
};

export type SavedResponse = {
  id: string;
  owner: string;
  sourceMessageId: string;
  sourceSessionId: string;
  sourceChatTitle: string;
  content: string;
  model: string | null;
  createdAt: string;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ApiMessage = Omit<Message, "role"> & {
  role: "USER" | "ASSISTANT" | "SYSTEM";
};

export type SessionSummary = {
  id: string;
  title: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  activeGeneration?: ActiveGeneration | null;
};

export type SessionDetails = SessionSummary & {
  messages: ApiMessage[];
};

export type SessionPageResponse = {
  items: SessionSummary[];
  nextCursor: string | null;
};

export type SessionPage = {
  items: Chat[];
  nextCursor: string | null;
};

export type SessionPages = InfiniteData<SessionPage, string | null>;

export type StreamMessageEvent = {
  sessionId: string;
  userMessage: ApiMessage;
};

export type StreamDoneEvent = {
  mode?: ChatMode;
  session: SessionSummary;
  message?: ApiMessage;
  messages?: ApiMessage[];
};

export type ModelFallbackEvent = {
  message: string;
  model: string;
  requestedModel: string;
};

export type SendMessageVariables = {
  attachments: PendingAttachment[];
  content: string;
  displayContent: string;
  models: string[];
  sessionId: string;
  temporaryAssistantIds: Record<string, string>;
  temporaryUserId: string;
};

export type PendingAttachment = {
  id: string;
  name: string;
  type: string;
  content: string;
  size: number;
};

export type ModelOption = {
  capability?: string;
  family?: string;
  id: string;
  label: string;
  provider?: "deepseek" | "openrouter";
};

export type ModelCatalog = {
  provider: string;
  fallbackModel: string;
  models: ModelOption[];
};
