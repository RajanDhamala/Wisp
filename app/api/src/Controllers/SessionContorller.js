import { randomUUID } from "node:crypto";
import { z } from "zod";
import asyncHandler from "../Utils/AsyncHandler.js";
import ApiError from "../Utils/ApiError.js";
import ApiResponse from "../Utils/ApiResponse.js";
import prisma from "../Utils/PrismaProvider.js";
import {
  FALLBACK_MODEL,
  getModelProvider,
  MODEL_CATALOG,
  MODEL_PROVIDER,
  resolveModel,
} from "../Config/Models.js";

const PROVIDERS = Object.freeze({
  deepseek: Object.freeze({
    apiKeyEnv: "DEEPSEEK_API_KEY",
    defaultUrl: "https://api.deepseek.com/chat/completions",
    label: "DeepSeek",
    urlEnv: "DEEPSEEK_API_URL",
  }),
  openrouter: Object.freeze({
    apiKeyEnv: "OPENROUTER_API_KEY",
    defaultUrl: "https://openrouter.ai/api/v1/chat/completions",
    label: "OpenRouter",
    urlEnv: "OPENROUTER_API_URL",
  }),
});
const MAX_CONTEXT_MESSAGES = 40;
const MAX_ATTACHMENT_CHARACTERS = 200_000;
const ACTIVE_GENERATION_TTL_MS = 30 * 60 * 1_000;
const DEFAULT_SESSION_PAGE_SIZE = 20;
const MAX_SESSION_PAGE_SIZE = 50;
const activeGenerations = new Map();

const getActiveGeneration = (sessionId) => {
  const generation = activeGenerations.get(sessionId);
  if (!generation) return null;
  if (Date.now() - generation.startedAt > ACTIVE_GENERATION_TTL_MS) {
    activeGenerations.delete(sessionId);
    return null;
  }
  return generation;
};

const serializeActiveGeneration = (sessionId) => {
  const generation = getActiveGeneration(sessionId);
  if (!generation) return null;

  return {
    id: generation.id,
    mode: generation.mode,
    models: generation.models,
    startedAt: new Date(generation.startedAt).toISOString(),
    branches: generation.models.map((model) => ({
      model,
      content: generation.branches[model]?.content ?? "",
      status: generation.branches[model]?.status ?? "streaming",
    })),
  };
};

const beginActiveGeneration = (sessionId, models) => {
  if (getActiveGeneration(sessionId)) return null;
  const generation = {
    id: randomUUID(),
    mode: models.length > 1 ? "branching" : "normal",
    models: [...models],
    startedAt: Date.now(),
    branches: Object.fromEntries(
      models.map((model) => [
        model,
        { content: "", status: "streaming" },
      ]),
    ),
  };
  activeGenerations.set(sessionId, generation);
  return generation;
};

const updateActiveBranch = (sessionId, model, update) => {
  const generation = getActiveGeneration(sessionId);
  const branch = generation?.branches[model];
  if (!branch) return;
  Object.assign(branch, update);
};

const appendActiveBranchToken = (sessionId, model, token) => {
  const generation = getActiveGeneration(sessionId);
  const branch = generation?.branches[model];
  if (!branch) return;
  branch.content += token;
};

const finishActiveGeneration = (sessionId) => {
  activeGenerations.delete(sessionId);
};

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  projectId: z.string().uuid().nullable().optional(),
});

const renameSessionSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

const listSessionsQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(500).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_SESSION_PAGE_SIZE)
    .default(DEFAULT_SESSION_PAGE_SIZE),
  projectId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
});

const sessionCursorSchema = z.object({
  id: z.string().uuid(),
  updatedAt: z.string().datetime(),
});

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(255).regex(/^[^\r\n]+$/),
  type: z.string().trim().max(100).regex(/^[^\r\n]*$/).default("text/plain"),
  content: z.string().max(MAX_ATTACHMENT_CHARACTERS),
});

const createMessageSchema = z
  .object({
    content: z.string().trim().max(50_000).default(""),
    model: z.string().trim().max(100).optional(),
    models: z
      .array(z.string().trim().min(1).max(100))
      .min(2)
      .max(4)
      .optional(),
    attachments: z.array(attachmentSchema).max(5).default([]),
  })
  .refine((data) => data.content || data.attachments.length, {
    message: "A message or attachment is required",
  })
  .refine(
    (data) =>
      data.attachments.reduce(
        (total, attachment) => total + attachment.content.length,
        0,
      ) <= MAX_ATTACHMENT_CHARACTERS,
    { message: "Attachment content is too large" },
  );

const parseBody = (schema, body) => {
  const result = schema.safeParse(body ?? {});

  if (!result.success) {
    throw new ApiError(400, "Invalid request body", result.error.issues);
  }

  return result.data;
};

const parseQuery = (schema, query) => {
  const result = schema.safeParse(query ?? {});

  if (!result.success) {
    throw new ApiError(400, "Invalid query parameters", result.error.issues);
  }

  return result.data;
};

const encodeSessionCursor = (session) =>
  Buffer.from(
    JSON.stringify({
      id: session.id,
      updatedAt: session.updatedAt.toISOString(),
    }),
    "utf8",
  ).toString("base64url");

const decodeSessionCursor = (cursor) => {
  try {
    const value = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    const parsed = sessionCursorSchema.parse(value);
    return {
      id: parsed.id,
      updatedAt: new Date(parsed.updatedAt),
    };
  } catch {
    throw new ApiError(400, "Invalid session cursor");
  }
};

const getProviderConfig = (modelId) => {
  const providerId = getModelProvider(modelId);
  const provider = PROVIDERS[providerId];
  const apiKey = process.env[provider.apiKeyEnv]?.trim();

  if (!apiKey) {
    throw new ApiError(
      500,
      `${provider.label} API key is not configured (${provider.apiKeyEnv})`,
    );
  }

  return {
    apiKey,
    id: providerId,
    label: provider.label,
    url: process.env[provider.urlEnv]?.trim() || provider.defaultUrl,
  };
};

const findOwnedSession = async (sessionId, ownerId, options = {}) => {
  const session = await prisma.sessions.findFirst({
    where: { id: sessionId, owner: ownerId },
    ...options,
  });

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  return session;
};

const createTitle = (prompt) => {
  const normalized = prompt
    .replace(/```[\s\S]*?```/g, " code ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "New chat";

  const words = normalized.split(" ").slice(0, 8).join(" ");
  const title = words.replace(/[.,!?;:]+$/g, "").trim();

  if (title.length <= 60) return title;
  return `${title.slice(0, 59).trimEnd()}…`;
};

const buildProviderUserContent = (content, attachments) => {
  if (!attachments.length) return content;

  const files = attachments
    .map((attachment, index) =>
      [
        `--- BEGIN USER FILE ${index + 1}: ${attachment.name} (${attachment.type || "text/plain"}) ---`,
        attachment.content,
        `--- END USER FILE ${index + 1} ---`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    content || "Use the attached files as context for this request.",
    "The following text files were provided by the user for this request only:",
    files,
  ].join("\n\n");
};

const SYSTEM_PROMPT = [
  "You are Wisp, an expert web app builder.",
  "Keep explanations practical and concise.",
  "When the user asks for a runnable interface, every source file MUST use a complete Markdown fence with the filename on the opening fence.",
  "Use this exact TSX shape, including both triple-backtick lines:",
  "```tsx file=/src/TestPage.tsx",
  "export default function TestPage() { return <div />; }",
  "```",
  "Use this exact CSS shape:",
  "```css file=/src/index.css",
  "body { margin: 0; }",
  "```",
  "Never output tsx file=/src/TestPage.tsx or another file header as a bare line without the opening triple backticks.",
  "Every runnable component file must use a default export. The component and filename may have any sensible name; the client creates the preview entry automatically.",
  "Use React and Tailwind CSS utility classes. Supported UI packages are lucide-react, motion (via motion/react), framer-motion, gsap, and @gsap/react; do not reference missing local assets or other unsupported packages.",
  "The preview theme is isolated from Wisp. Generated apps must own their light/dark state; for dark mode, toggle a dark class inside the generated app and provide explicit light and dark page backgrounds instead of relying on the host theme.",
  "Put shell commands only inside complete bash fences: an opening ```bash line, the commands, and a closing ``` line. Commands are displayed for the user to copy and are never executed automatically.",
  "Never mix prose inside a named file fence. Normal explanation must stay outside code fences.",
  "Voice messages and image uploads are not supported.",
].join("\n");

const selectContextForModel = (messages, modelId, providerUserContent) => {
  const selected = [];
  let assistantGroup = [];

  const flushAssistantGroup = () => {
    if (!assistantGroup.length) return;

    const response =
      assistantGroup.length === 1
        ? assistantGroup[0]
        : (assistantGroup.find((message) => message.model === modelId) ??
          assistantGroup[0]);
    selected.push(response);
    assistantGroup = [];
  };

  for (const message of messages) {
    if (message.role === "ASSISTANT") {
      assistantGroup.push(message);
      continue;
    }

    flushAssistantGroup();
    selected.push(message);
  }
  flushAssistantGroup();

  return selected.map((message, index) => ({
    role: message.role.toLowerCase(),
    content:
      index === selected.length - 1 && message.role === "USER"
        ? providerUserContent
        : message.content,
  }));
};

const normalizeUsage = (usage = {}) => {
  const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const cachedInputTokens =
    usage.prompt_cache_hit_tokens ??
    usage.prompt_tokens_details?.cached_tokens ??
    usage.input_tokens_details?.cached_tokens ??
    usage.cache_read_input_tokens ??
    0;

  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
    totalTokens: usage.total_tokens ?? inputTokens + outputTokens,
  };
};

const writeEvent = (res, event, data) => {
  if (res.destroyed || res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

const startEventStream = (res) => {
  if (res.destroyed) return;
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
};

const isUnsupportedModelResponse = (status, body) =>
  [400, 401, 404].includes(status) &&
  /(ModelError|model[^\n]*not supported|unsupported model)/i.test(body);

const getProviderFailureMessage = (model, status, body) => {
  if (isUnsupportedModelResponse(status, body)) {
    return `Model ${model} is unavailable.`;
  }
  if (status === 402) {
    return "The model provider has insufficient credits.";
  }
  if (status === 429) {
    return "The model provider rate limit was reached. Please try again later.";
  }
  if ([401, 403].includes(status)) {
    return "The model provider rejected the configured API credentials.";
  }
  if (status >= 500) {
    return "The model provider is temporarily unavailable. Please try again later.";
  }
  return `The provider rejected ${model}. Please try again.`;
};

const persistGenerationFailure = async (sessionId, model, message) => {
  try {
    const [assistantMessage] = await prisma.$transaction([
      prisma.messages.create({
        data: {
          role: "ASSISTANT",
          content: `I couldn't complete this response. ${message}`,
          model,
          sessionId,
        },
      }),
      prisma.sessions.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return assistantMessage;
  } catch (error) {
    console.error("Could not persist generation failure", error);
    return null;
  }
};

const streamProviderResponse = async (
  response,
  res,
  selectedModel,
  streamModel = selectedModel,
  onToken,
) => {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new ApiError(502, "Provider returned an empty response stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let usage = normalizeUsage();
  let finishReason = null;
  let providerModel = selectedModel;
  let providerDone = false;

  const consumeLine = (rawLine) => {
    const line = rawLine.replace(/\r$/, "").trim();
    if (!line.startsWith("data:")) return false;

    const payload = line.slice(5).trim();
    if (!payload) return false;
    if (payload === "[DONE]") return true;

    const chunk = JSON.parse(payload);
    const token = chunk.choices?.[0]?.delta?.content ?? "";

    if (token) {
      content += token;
      onToken?.(token);
      writeEvent(res, "token", { model: streamModel, token });
    }

    if (chunk.usage) usage = normalizeUsage(chunk.usage);
    if (chunk.model) providerModel = chunk.model;
    if (chunk.choices?.[0]?.finish_reason) {
      finishReason = chunk.choices[0].finish_reason;
    }

    return false;
  };

  while (!providerDone) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      providerDone = consumeLine(line);
      if (providerDone) break;
      newlineIndex = buffer.indexOf("\n");
    }

    if (done) {
      if (buffer.trim()) providerDone = consumeLine(buffer);
      break;
    }
  }

  if (!content.trim()) {
    throw new ApiError(502, "Provider completed without message content");
  }

  return { content, usage, finishReason, providerModel };
};

const CreateSession = asyncHandler(async (req, res) => {
  const { projectId, title } = parseBody(createSessionSchema, req.body);

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, owner: req.user.id },
      select: { id: true },
    });
    if (!project) throw new ApiError(404, "Project not found");
  }

  const session = await prisma.sessions.create({
    data: {
      owner: req.user.id,
      ...(title ? { title } : {}),
      ...(projectId ? { projectId } : {}),
    },
  });

  if (projectId) {
    await prisma.project.update({
      where: { id: projectId },
      data: { updatedAt: new Date() },
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, "Session created", session));
});

const ListSessions = asyncHandler(async (req, res) => {
  const { cursor: encodedCursor, limit, projectId, search } = parseQuery(
    listSessionsQuerySchema,
    req.query,
  );
  const cursor = encodedCursor
    ? decodeSessionCursor(encodedCursor)
    : null;
  const sessions = await prisma.sessions.findMany({
    where: {
      owner: req.user.id,
      ...(projectId ? { projectId } : {}),
      ...(search
        ? { title: { contains: search, mode: "insensitive" } }
        : {}),
      ...(cursor
        ? {
            OR: [
              { updatedAt: { lt: cursor.updatedAt } },
              {
                updatedAt: cursor.updatedAt,
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true, createdAt: true },
      },
    },
  });

  const hasNextPage = sessions.length > limit;
  const page = sessions.slice(0, limit);
  const items = page.map(({ messages, _count, ...session }) => ({
    ...session,
    messageCount: _count.messages,
    lastMessage: messages[0] ?? null,
  }));
  const nextCursor = hasNextPage
    ? encodeSessionCursor(page.at(-1))
    : null;

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Sessions fetched", {
        items,
        nextCursor,
      }),
    );
});

const GetSession = asyncHandler(async (req, res) => {
  const session = await findOwnedSession(req.params.sessionId, req.user.id, {
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Session fetched", {
        ...session,
        activeGeneration: serializeActiveGeneration(session.id),
      }),
    );
});

const RenameSession = asyncHandler(async (req, res) => {
  const { title } = parseBody(renameSessionSchema, req.body);
  await findOwnedSession(req.params.sessionId, req.user.id);

  const session = await prisma.sessions.update({
    where: { id: req.params.sessionId },
    data: { title },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Session renamed", session));
});

const DeleteSession = asyncHandler(async (req, res) => {
  const result = await prisma.sessions.deleteMany({
    where: { id: req.params.sessionId, owner: req.user.id },
  });

  if (!result.count) {
    throw new ApiError(404, "Session not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Session deleted", { id: req.params.sessionId }));
});

const DeleteMessage = asyncHandler(async (req, res) => {
  await findOwnedSession(req.params.sessionId, req.user.id);

  const result = await prisma.messages.deleteMany({
    where: {
      id: req.params.messageId,
      role: "ASSISTANT",
      sessionId: req.params.sessionId,
    },
  });

  if (!result.count) {
    throw new ApiError(404, "Response not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "Response deleted", {
      id: req.params.messageId,
    }),
  );
});

const ListModels = asyncHandler(async (_req, res) => {
  return res.status(200).json(
    new ApiResponse(200, "Models fetched", {
      provider: MODEL_PROVIDER,
      fallbackModel: FALLBACK_MODEL,
      models: MODEL_CATALOG,
    }),
  );
});

const CreateMessage = asyncHandler(async (req, res) => {
  const { attachments, content, model, models } = parseBody(
    createMessageSchema,
    req.body,
  );
  const selectedModels = models
    ? [...new Set(models.map(resolveModel))]
    : [resolveModel(model)];
  if (models && selectedModels.length < 2) {
    throw new ApiError(400, "Choose at least two different models");
  }
  const selectedModel = selectedModels[0];
  const usedCatalogFallback =
    !models && typeof model === "string" && model !== selectedModel;
  const session = await findOwnedSession(req.params.sessionId, req.user.id);
  const activeGeneration = beginActiveGeneration(session.id, selectedModels);
  if (!activeGeneration) {
    throw new ApiError(409, "This session already has a response in progress");
  }
  const storedContent =
    content ||
    `Shared ${attachments.length} text ${attachments.length === 1 ? "file" : "files"} for context.`;
  const providerUserContent = buildProviderUserContent(content, attachments);

  let userMessage;
  let context;
  try {
    userMessage = await prisma.messages.create({
      data: {
        role: "USER",
        content: storedContent,
        sessionId: session.id,
      },
    });

    context = await prisma.messages.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: MAX_CONTEXT_MESSAGES,
      select: { role: true, content: true, model: true },
    });
  } catch (error) {
    finishActiveGeneration(session.id);
    throw error;
  }
  const orderedContext = [...context].reverse();
  const firstUserPrompt =
    orderedContext.find((message) => message.role === "USER")?.content ??
    storedContent;
  const buildProviderMessages = (modelId) => [
    { role: "system", content: SYSTEM_PROMPT },
    ...selectContextForModel(orderedContext, modelId, providerUserContent),
  ];
  const requestProvider = (modelId) => {
    const provider = getProviderConfig(modelId);

    return fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: buildProviderMessages(modelId),
        ...(provider.id === "deepseek"
          ? { thinking: { type: "disabled" } }
          : { reasoning: { effort: "none" } }),
        stream: true,
        stream_options: { include_usage: true },
      }),
    });
  };

  if (selectedModels.length > 1) {
    startEventStream(res);
    writeEvent(res, "message", {
      mode: "branching",
      models: selectedModels,
      sessionId: session.id,
      userMessage,
    });

    const runBranch = async (branchModel) => {
      writeEvent(res, "branch_start", { model: branchModel });

      try {
        const providerResponse = await requestProvider(branchModel);
        const providerError = providerResponse.ok
          ? ""
          : await providerResponse.text();

        if (!providerResponse.ok) {
          const failureMessage = getProviderFailureMessage(
            branchModel,
            providerResponse.status,
            providerError,
          );
          console.error(
            "Branch provider request failed",
            branchModel,
            providerResponse.status,
            providerError,
          );
          throw new ApiError(502, failureMessage);
        }

        const result = await streamProviderResponse(
          providerResponse,
          res,
          branchModel,
          branchModel,
          (token) =>
            appendActiveBranchToken(session.id, branchModel, token),
        );
        updateActiveBranch(session.id, branchModel, { status: "complete" });
        writeEvent(res, "branch_complete", {
          model: branchModel,
          providerModel: result.providerModel,
        });
        return { ...result, requestedModel: branchModel };
      } catch (error) {
        const failureMessage =
          error instanceof ApiError
            ? error.message
            : `${branchModel} could not be reached. Please try again.`;
        console.error("Branch generation failed", branchModel, error);
        const failureContent = `I couldn't complete this response. ${failureMessage}`;
        updateActiveBranch(session.id, branchModel, {
          content: failureContent,
          status: "error",
        });
        writeEvent(res, "branch_error", {
          model: branchModel,
          message: failureMessage,
        });
        return {
          content: failureContent,
          error: failureMessage,
          finishReason: "error",
          providerModel: branchModel,
          requestedModel: branchModel,
          usage: normalizeUsage(),
        };
      }
    };

    const results = await Promise.all(selectedModels.map(runBranch));
    const generatedTitle =
      session.title === "New chat" ? createTitle(firstUserPrompt) : session.title;
    const branchCompletedAt = Date.now();

    try {
      const transaction = await prisma.$transaction([
        ...results.map((result, index) =>
          prisma.messages.create({
            data: {
              role: "ASSISTANT",
              content: result.content,
              model: result.providerModel,
              inputTokens: result.usage.inputTokens,
              outputTokens: result.usage.outputTokens,
              cachedInputTokens: result.usage.cachedInputTokens,
              totalTokens: result.usage.totalTokens,
              createdAt: new Date(branchCompletedAt + index),
              sessionId: session.id,
            },
          }),
        ),
        prisma.sessions.update({
          where: { id: session.id },
          data: { title: generatedTitle, updatedAt: new Date() },
        }),
      ]);
      const updatedSession = transaction.at(-1);
      const assistantMessages = transaction.slice(0, -1);

      writeEvent(res, "done", {
        mode: "branching",
        session: updatedSession,
        messages: assistantMessages,
        failures: results
          .filter((result) => result.error)
          .map((result) => ({
            message: result.error,
            model: result.requestedModel,
          })),
      });
    } catch (error) {
      console.error("Could not persist branching responses", error);
      writeEvent(res, "error", {
        message: "The model responses finished but could not be saved",
      });
    }

    finishActiveGeneration(session.id);
    if (!res.destroyed && !res.writableEnded) res.end();
    return;
  }

  let providerModel = selectedModel;
  let providerResponse;
  let providerError = "";

  try {
    providerResponse = await requestProvider(providerModel);
    providerError = providerResponse.ok ? "" : await providerResponse.text();
  } catch (error) {
    console.error("Provider request could not be completed", error);
    const failureMessage =
      "The model provider could not be reached. Please try again.";
    await persistGenerationFailure(session.id, providerModel, failureMessage);
    finishActiveGeneration(session.id);
    throw new ApiError(502, failureMessage);
  }

  if (!providerResponse.ok) {
    const failureMessage = getProviderFailureMessage(
      providerModel,
      providerResponse.status,
      providerError,
    );
    console.error(
      "Provider request failed",
      providerResponse.status,
      providerError,
    );
    await persistGenerationFailure(session.id, providerModel, failureMessage);
    finishActiveGeneration(session.id);
    throw new ApiError(502, failureMessage);
  }

  startEventStream(res);

  if (usedCatalogFallback) {
    writeEvent(res, "model_fallback", {
      message: `${model} is not in the model catalog. Switched to ${FALLBACK_MODEL}.`,
      model: providerModel,
      requestedModel: model,
    });
  }

  writeEvent(res, "message", {
    sessionId: session.id,
    userMessage,
  });

  try {
    const result = await streamProviderResponse(
      providerResponse,
      res,
      providerModel,
      selectedModel,
      (token) => appendActiveBranchToken(session.id, selectedModel, token),
    );
    updateActiveBranch(session.id, selectedModel, { status: "complete" });
    const generatedTitle =
      session.title === "New chat" ? createTitle(firstUserPrompt) : session.title;

    const [assistantMessage, updatedSession] = await prisma.$transaction([
      prisma.messages.create({
        data: {
          role: "ASSISTANT",
          content: result.content,
          model: result.providerModel,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          cachedInputTokens: result.usage.cachedInputTokens,
          totalTokens: result.usage.totalTokens,
          sessionId: session.id,
        },
      }),
      prisma.sessions.update({
        where: { id: session.id },
        data: { title: generatedTitle, updatedAt: new Date() },
      }),
    ]);

    writeEvent(res, "done", {
      session: updatedSession,
      message: assistantMessage,
      usage: result.usage,
      finishReason: result.finishReason,
    });
    if (!res.destroyed && !res.writableEnded) res.end();
  } catch (error) {
    console.error("Message stream failed", error);
    const failureMessage =
      error instanceof ApiError ? error.message : "Message stream failed";
    updateActiveBranch(session.id, selectedModel, {
      content: `I couldn't complete this response. ${failureMessage}`,
      status: "error",
    });
    await persistGenerationFailure(session.id, providerModel, failureMessage);
    writeEvent(res, "error", {
      message: failureMessage,
    });
    if (!res.destroyed && !res.writableEnded) res.end();
  }
  finishActiveGeneration(session.id);
});

export {
  CreateSession,
  ListSessions,
  GetSession,
  RenameSession,
  DeleteSession,
  DeleteMessage,
  ListModels,
  CreateMessage,
};
