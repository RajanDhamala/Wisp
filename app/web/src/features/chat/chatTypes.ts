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

export type LibraryPage = {
  items: SavedResponse[];
  nextCursor: string | null;
};

export type LibraryPages = InfiniteData<LibraryPage, string | null>;

export type UserMemory = {
  id: string;
  kind: "PREFERENCE" | "PROFILE" | "PROJECT" | "CONSTRAINT";
  content: string;
  confidence: number;
  importance: number;
  createdAt: string;
  updatedAt: string;
};

export type MemoryPage = {
  items: UserMemory[];
  nextCursor: string | null;
};

export type MemoryPages = InfiniteData<MemoryPage, string | null>;

export type UsageMetric = {
  cachedInputTokens: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  totalTokens: number;
};

export type UsageRange = "5h" | "24h" | "7d" | "30d" | "90d";

export type UsageSummary = {
  daily: Array<UsageMetric & { date: string }>;
  dailyByModel: Array<UsageMetric & { date: string; model: string }>;
  models: Array<UsageMetric & { model: string }>;
  plan: {
    defaultIncludedCreditUsd: number;
    enforcementEnabled: boolean;
    freeMessagesPerDay: number;
  };
  period: {
    bucket: "day" | "hour";
    days: number;
    end: string;
    range: UsageRange;
    start: string;
  };
  quota: {
    metered: boolean;
    periodStartedAt: string | null;
    remainingTokens: string | null;
    source: "redis" | "database" | null;
    tokenLimit: string | null;
    updatedAt: string | null;
    usedTokens: string | null;
  };
  totals: UsageMetric & { messages: number };
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
  webSearch: boolean;
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
