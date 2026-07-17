import {
  ArrowUp,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Ellipsis,
  FileText,
  Folder,
  Globe2,
  GitBranch,
  Image as ImageIcon,
  Library,
  LogOut,
  Maximize2,
  Menu,
  Mic,
  Minimize2,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Play,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  SquarePen,
  Star,
  Sun,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  lazy,
  memo,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import claudeLogo from "@lobehub/icons-static-svg/icons/claude-color.svg";
import deepSeekLogo from "@lobehub/icons-static-svg/icons/deepseek-color.svg";
import kimiLogo from "@lobehub/icons-static-svg/icons/kimi.svg";
import minimaxLogo from "@lobehub/icons-static-svg/icons/minimax-color.svg";
import openAiLogo from "@lobehub/icons-static-svg/icons/openai.svg";
import qwenLogo from "@lobehub/icons-static-svg/icons/qwen-color.svg";
import xiaomiMimoLogo from "@lobehub/icons-static-svg/icons/xiaomimimo.svg";
import zaiLogo from "@lobehub/icons-static-svg/icons/zai.svg";
import useUserStore, {
  CURRENT_USER_QUERY_KEY,
} from "../UserStore";
import { API_BASE_URL } from "../Utils/ApiConfig";
import { LANDING_DRAFT_STORAGE_KEY } from "../Utils/LandingDraft";
import {
  getSandpackBundlerUrl,
  SANDPACK_BUNDLER_TIMEOUT_MS,
} from "../Utils/SandpackConfig";

type PreviewTemplate = "react-ts" | "static";

type PreviewRuntimeProps = {
  dependencies: Record<string, string>;
  entry?: string;
  files: Record<string, string>;
  height: number | string;
  template: PreviewTemplate;
  theme: "light" | "dark";
};

type HighlightedCodeProps = {
  code: string;
  filePath: string;
};

const SandpackHighlightedCode = lazy(() =>
  import("@codesandbox/sandpack-react").then(
    ({ SandpackCodeViewer, SandpackProvider }) => ({
      default: ({ code, filePath }: HighlightedCodeProps) => (
        <SandpackProvider
          files={{ [filePath]: code }}
          options={{ activeFile: filePath, initMode: "immediate" }}
          template="static"
          theme="dark"
        >
          <div className="[&_.sp-button]:!hidden [&_.sp-code-editor]:!bg-transparent [&_.sp-cm]:!h-auto [&_.sp-stack]:!h-auto [&_.sp-stack]:!bg-transparent">
            <SandpackCodeViewer
              code={code}
              initMode="immediate"
              showLineNumbers={false}
              showTabs={false}
              wrapContent={false}
            />
          </div>
        </SandpackProvider>
      ),
    }),
  ),
);

const SandpackRuntime = lazy(() =>
  import("@codesandbox/sandpack-react").then(
    ({
      SandpackLayout,
      SandpackPreview,
      SandpackProvider,
      useSandpack,
      useSandpackConsole,
    }) => {
      const RuntimePreview = ({ height }: Pick<PreviewRuntimeProps, "height">) => {
        const { sandpack } = useSandpack();
        const automaticRetries = useRef(0);
        const { logs } = useSandpackConsole({
          maxMessageCount: 20,
          resetOnPreviewRestart: true,
          showSyntaxError: true,
        });
        const runtimeError = sandpack.error?.message;
        const timedOut = sandpack.status === "timeout";
        const consoleErrors = logs
          .filter((log) => log.method === "error")
          .flatMap((log) => log.data ?? [])
          .map((value) =>
            typeof value === "string" ? value : JSON.stringify(value, null, 2),
          )
          .join("\n");
        const failureMessage =
          runtimeError ||
          consoleErrors ||
          (timedOut
            ? "The preview runtime timed out. Check your connection and try again."
            : null);

        useEffect(() => {
          if (sandpack.status === "done") automaticRetries.current = 0;
          if (sandpack.status !== "timeout" || automaticRetries.current >= 1)
            return;

          automaticRetries.current += 1;
          const retry = window.setTimeout(() => {
            void sandpack.runSandpack();
          }, 1_000);
          return () => window.clearTimeout(retry);
        }, [sandpack]);

        return (
          <div className="relative w-full" style={{ height }}>
            <SandpackLayout
              style={{ border: 0, borderRadius: 0, height: "100%", width: "100%" }}
            >
              <SandpackPreview
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showOpenNewtab={false}
                showRefreshButton={false}
                showSandpackErrorOverlay
                style={{ height: "100%", width: "100%" }}
              />
            </SandpackLayout>
            {failureMessage && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white p-6 dark:bg-zinc-950">
                <div className="max-w-2xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <p className="font-semibold">Preview failed to start</p>
                  <pre className="subtle-scrollbar mt-2 max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs">
                    {failureMessage}
                  </pre>
                  {timedOut && (
                    <button
                      className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-950"
                      onClick={() => void sandpack.runSandpack()}
                      type="button"
                    >
                      Try preview again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      };

      return {
        default: ({
          dependencies,
          entry,
          files,
          height,
          template,
          theme,
        }: PreviewRuntimeProps) => (
          <SandpackProvider
            customSetup={{
              dependencies,
              ...(entry ? { entry } : {}),
            }}
            files={files}
            options={{
              autorun: true,
              autoReload: true,
              bundlerTimeOut: SANDPACK_BUNDLER_TIMEOUT_MS,
              bundlerURL: getSandpackBundlerUrl(),
              initMode: "immediate",
              recompileMode: "delayed",
              recompileDelay: 300,
            }}
            template={template}
            theme={theme}
          >
            <RuntimePreview height={height} />
          </SandpackProvider>
        ),
      };
    },
  ),
);

type Role = "user" | "assistant" | "system";
type SessionGroup = "Today" | "Previous 7 days" | "Previous 30 days" | "Older";
type ChatMode = "normal" | "branching";
type GenerationBranchStatus = "streaming" | "complete" | "error";

type ActiveGeneration = {
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

type Message = {
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

type Chat = {
  id: string;
  title: string;
  projectId: string | null;
  group: SessionGroup;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  activeGeneration: ActiveGeneration | null;
};

type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ApiMessage = Omit<Message, "role"> & {
  role: "USER" | "ASSISTANT" | "SYSTEM";
};

type SessionSummary = {
  id: string;
  title: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  activeGeneration?: ActiveGeneration | null;
};

type SessionDetails = SessionSummary & {
  messages: ApiMessage[];
};

type StreamMessageEvent = {
  sessionId: string;
  userMessage: ApiMessage;
};

type StreamDoneEvent = {
  mode?: ChatMode;
  session: SessionSummary;
  message?: ApiMessage;
  messages?: ApiMessage[];
};

type ModelFallbackEvent = {
  message: string;
  model: string;
  requestedModel: string;
};

type SendMessageVariables = {
  attachments: PendingAttachment[];
  content: string;
  displayContent: string;
  models: string[];
  sessionId: string;
  temporaryAssistantIds: Record<string, string>;
  temporaryUserId: string;
};

type PendingAttachment = {
  id: string;
  name: string;
  type: string;
  content: string;
  size: number;
};

type ModelOption = {
  capability?: string;
  family?: string;
  id: string;
  label: string;
  provider?: "deepseek" | "openrouter";
};

type ModelCatalog = {
  provider: string;
  fallbackModel: string;
  models: ModelOption[];
};

const MAX_ATTACHMENT_COUNT = 5;
const MAX_ATTACHMENT_BYTES = 150_000;
const MAX_TOTAL_ATTACHMENT_CHARACTERS = 200_000;
const MAX_EVENT_STREAM_BLOCK_CHARACTERS = 1_000_000;
const STREAM_TOKEN_FLUSH_MS = 40;
const MAX_PREVIEW_PATH_SEGMENTS = 12;
const MAX_PREVIEW_PATH_SEGMENT_CHARACTERS = 80;
const APPROVED_PREVIEW_DEPENDENCIES: Readonly<Record<string, string>> =
  Object.freeze({
    "lucide-react": "1.14.0",
  });
const SENSITIVE_ATTACHMENT_NAMES = [
  /^\.env(?:\.|$)/i,
  /^\.netrc$/i,
  /^\.npmrc$/i,
  /^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)/i,
  /(?:^|[-_.])credentials?(?:[-_.]|$)/i,
  /\.(?:key|p12|pem|pfx)$/i,
];
const TEXT_FILE_EXTENSIONS = new Set([
  "bash",
  "c",
  "cpp",
  "css",
  "csv",
  "go",
  "h",
  "html",
  "java",
  "js",
  "json",
  "jsx",
  "less",
  "md",
  "mjs",
  "py",
  "scss",
  "sh",
  "sql",
  "svg",
  "text",
  "toml",
  "ts",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
  "zsh",
]);

const sessionQueryKeys = {
  all: ["sessions"] as const,
  detail: (sessionId: string) => ["sessions", sessionId] as const,
  models: ["session-models"] as const,
};

const projectQueryKeys = {
  all: ["projects"] as const,
};

const RECOVERING_ASSISTANT_ID = "recovering-assistant";
const GENERATION_RECOVERY_WINDOW_MS = 5 * 60 * 1000;
const FAVORITE_MODELS_STORAGE_KEY = "wisp-favorite-models";
const BRANCH_MODE_STORAGE_KEY = "wisp-chat-mode";
const BRANCH_MODELS_STORAGE_KEY = "wisp-branch-models";
const SELECTED_PROJECT_STORAGE_KEY = "wisp-selected-project";
const MIN_BRANCH_MODELS = 2;
const MAX_BRANCH_MODELS = 4;
const getRecoveryMessageId = (generationId: string, model: string) =>
  `${RECOVERING_ASSISTANT_ID}-${generationId}-${model}`;

const MODEL_LOGOS: ReadonlyArray<{
  invertInDark?: boolean;
  match: string;
  src: string;
}> = [
  { match: "anthropic", src: claudeLogo },
  { match: "claude", src: claudeLogo },
  { match: "openai", src: openAiLogo, invertInDark: true },
  { match: "gpt", src: openAiLogo, invertInDark: true },
  { match: "deepseek", src: deepSeekLogo },
  { match: "minimax", src: minimaxLogo },
  { match: "qwen", src: qwenLogo },
  { match: "mimo", src: xiaomiMimoLogo, invertInDark: true },
  { match: "kimi", src: kimiLogo, invertInDark: true },
  { match: "glm", src: zaiLogo, invertInDark: true },
];

const ModelLogo = ({
  className = "size-5",
  label,
  modelId,
}: {
  className?: string;
  label: string;
  modelId?: string | null;
}) => {
  const modelLogo = MODEL_LOGOS.find(({ match }) =>
    modelId?.toLowerCase().includes(match),
  );

  if (!modelLogo) {
    return (
      <span
        aria-hidden="true"
        className={`${className} flex items-center justify-center rounded-md bg-zinc-900 text-[0.55em] font-bold uppercase text-white dark:bg-white dark:text-zinc-950`}
      >
        {label.trim().charAt(0) || "W"}
      </span>
    );
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className={`${className} object-contain ${modelLogo.invertInDark ? "dark:invert" : ""}`}
      src={modelLogo.src}
    />
  );
};

const groupSession = (updatedAt: string): SessionGroup => {
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

const normalizeMessage = (message: ApiMessage): Message => ({
  ...message,
  role: message.role.toLowerCase() as Role,
});

const normalizeSession = (
  session: SessionSummary,
  messages: Message[] = [],
): Chat => ({
  id: session.id,
  title: session.title,
  projectId: session.projectId ?? null,
  group: groupSession(session.updatedAt),
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  messages,
  activeGeneration: session.activeGeneration ?? null,
});

const sortSessions = (sessions: Chat[]) =>
  [...sessions].sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() -
      new Date(first.updatedAt).getTime(),
  );

const isSupportedTextFile = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type.startsWith("text/") || TEXT_FILE_EXTENSIONS.has(extension);
};

const isSensitiveAttachment = (file: File) =>
  SENSITIVE_ATTACHMENT_NAMES.some((pattern) => pattern.test(file.name));

const formatFileSize = (bytes: number) =>
  bytes < 1_000 ? `${bytes} B` : `${Math.ceil(bytes / 1_000)} KB`;

const isAwaitingPersistedAssistant = (chat?: Chat | null) => {
  if (chat?.activeGeneration) return true;
  const lastMessage = chat?.messages.at(-1);
  if (!lastMessage || lastMessage.role !== "user") return false;
  if (!lastMessage.createdAt) return true;

  return (
    Date.now() - new Date(lastMessage.createdAt).getTime() <
    GENERATION_RECOVERY_WINDOW_MS
  );
};

const readResponseError = async (response: Response) => {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;

  if (response.status === 401) {
    window.location.assign("/login");
  }

  return body?.message || `Request failed with status ${response.status}`;
};

const apiRequest = async <T,>(path: string, init?: RequestInit): Promise<T> => {
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

const consumeEventStream = async (
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

const getEventString = (data: unknown, key: string) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
};

type ContentPart = {
  type: "text" | "code" | "command";
  content: string;
  complete?: boolean;
  language?: string;
  filePath?: string;
};

const commandLanguages = new Set([
  "bash",
  "sh",
  "shell",
  "zsh",
  "terminal",
  "console",
]);

const getFenceDetails = (info: string) => {
  const infoParts = info.split(/\s+/).filter(Boolean);
  const compactHeader = infoParts[0]?.match(/^([^:]+):(.+)$/);
  const language = (compactHeader?.[1] || infoParts[0] || "text").toLowerCase();
  const declaredFile = info.match(
    /(?:file|filename|title)=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i,
  );
  const positionalFile = infoParts.slice(1).find((part) =>
    /^(?![a-z]+=(?:.|$)).+\.[a-z0-9]+$/i.test(
      part.replace(/^['"]|['"]$/g, ""),
    ),
  );

  return {
    filePath:
      declaredFile?.[1] ??
      declaredFile?.[2] ??
      declaredFile?.[3] ??
      compactHeader?.[2] ??
      positionalFile,
    language,
  };
};

const repairUnfencedNamedBlocks = (content: string) =>
  content.replace(
    /(^|\n)([a-z0-9_+.-]+\s+(?:file|filename|title)=(?:"[^"]+"|'[^']+'|[^\s]+))[ \t]*\r?\n(?![ \t]*(?:\r?\n[ \t]*)*```)/gi,
    (_match, prefix: string, header: string) =>
      `${prefix}\`\`\`${header}\n`,
  );

const parseMessageContent = (content: string): ContentPart[] => {
  const repairedContent = repairUnfencedNamedBlocks(content);
  const parts: ContentPart[] = [];
  let searchIndex = 0;

  while (searchIndex < repairedContent.length) {
    const openingFenceIndex = repairedContent.indexOf("```", searchIndex);
    if (openingFenceIndex === -1) {
      parts.push({
        type: "text",
        content: repairedContent.slice(searchIndex),
      });
      break;
    }

    const textBeforeFence = repairedContent.slice(searchIndex, openingFenceIndex);
    const precedingHeader = textBeforeFence.match(
      /(?:^|\n)((?:[a-z0-9_+.-]+)\s+(?:file|filename|title)=(?:"[^"]+"|'[^']+'|\S+))\s*$/i,
    );
    const proseBeforeFence = precedingHeader
      ? textBeforeFence.slice(0, precedingHeader.index)
      : textBeforeFence;

    if (proseBeforeFence) {
      parts.push({ type: "text", content: proseBeforeFence });
    }

    const headerEndIndex = repairedContent.indexOf(
      "\n",
      openingFenceIndex + 3,
    );
    const hasCompleteHeader = headerEndIndex !== -1;
    const inlineInfo = hasCompleteHeader
      ? repairedContent.slice(openingFenceIndex + 3, headerEndIndex).trim()
      : repairedContent.slice(openingFenceIndex + 3).trim();
    const info = precedingHeader?.[1] ?? inlineInfo;
    const { filePath, language } = getFenceDetails(info);
    const codeStartIndex = hasCompleteHeader
      ? headerEndIndex + 1
      : repairedContent.length;
    const closingFenceIndex = hasCompleteHeader
      ? repairedContent.indexOf("```", codeStartIndex)
      : -1;
    const complete = closingFenceIndex !== -1;
    const code = repairedContent.slice(
      codeStartIndex,
      complete ? closingFenceIndex : repairedContent.length,
    );

    parts.push({
      type: commandLanguages.has(language) ? "command" : "code",
      complete,
      content: complete ? code.replace(/\s+$/, "") : code,
      language,
      filePath,
    });

    if (!complete) break;
    searchIndex = closingFenceIndex + 3;
  }

  return parts;
};

const sanitizePreviewPathSegment = (segment: string) =>
  segment
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._@()+-]/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, MAX_PREVIEW_PATH_SEGMENT_CHARACTERS);

const normalizePreviewPath = (path: string) => {
  const cleaned = path
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .slice(0, MAX_PREVIEW_PATH_SEGMENTS)
    .map(sanitizePreviewPathSegment)
    .filter(Boolean)
    .join("/");
  return `/${cleaned || "generated.tsx"}`;
};

const getComponentName = (part: ContentPart) => {
  const candidates = Array.from(
    part.content.matchAll(
      /(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|class|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g,
    ),
    (match) => match[1],
  );

  return (
    candidates.find((name) => /^[A-Z]/.test(name)) ?? candidates.at(-1) ?? null
  );
};

const getPartExtension = (part: ContentPart) =>
  part.filePath?.split(".").pop()?.replace(/['"]+$/, "").toLowerCase() ||
  previewExtensionByLanguage[part.language || ""];

const isHtmlPart = (part: ContentPart) =>
  part.type === "code" &&
  (part.language === "html" || getPartExtension(part) === "html");

const isExplicitReactEntry = (part: ContentPart) =>
  part.type === "code" &&
  ["tsx", "jsx", "ts", "js"].includes(getPartExtension(part) || "") &&
  /(?:createRoot\s*\(|ReactDOM\.render\s*\()/.test(part.content);

const isRunnableComponent = (part: ContentPart) => {
  if (part.type !== "code") return false;
  const extension = getPartExtension(part);
  const isReactLanguage =
    part.language === "tsx" ||
    part.language === "jsx" ||
    extension === "tsx" ||
    extension === "jsx";

  return (
    isReactLanguage &&
    /<[A-Za-z]|React\.createElement/.test(part.content) &&
    (/export\s+default/.test(part.content) || Boolean(getComponentName(part)))
  );
};

const collectDeclaredDependencies = (parts: ContentPart[]) => {
  const dependencies = Object.create(null) as Record<string, string>;

  for (const part of parts) {
    if (
      part.type !== "code" ||
      part.filePath?.split("/").pop()?.replace(/['"]+$/, "") !== "package.json"
    ) {
      continue;
    }

    try {
      const packageJson = JSON.parse(part.content) as {
        dependencies?: unknown;
        devDependencies?: unknown;
      };
      const declaredNames = [
        packageJson.devDependencies,
        packageJson.dependencies,
      ].flatMap((value) =>
        value && typeof value === "object" && !Array.isArray(value)
          ? Object.keys(value)
          : [],
      );
      for (const packageName of declaredNames) {
        if (
          Object.hasOwn(APPROVED_PREVIEW_DEPENDENCIES, packageName)
        ) {
          dependencies[packageName] =
            APPROVED_PREVIEW_DEPENDENCIES[packageName];
        }
      }
    } catch {
      // Invalid package manifests are still shown in chat, but cannot configure the preview.
    }
  }

  return dependencies;
};

const collectRuntimeDependencies = (
  files: Record<string, string>,
  declaredDependencies: Record<string, string>,
) => {
  const dependencies = Object.assign(
    Object.create(null) as Record<string, string>,
    declaredDependencies,
  );
  const importPattern = /(?:from\s+|import\s*)["']([^"']+)["']/g;

  for (const content of Object.values(files)) {
    let match: RegExpExecArray | null;
    while ((match = importPattern.exec(content)) !== null) {
      const specifier = match[1];
      if (specifier.startsWith(".") || specifier.startsWith("/")) continue;

      const packageName = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : specifier.split("/")[0];
      if (Object.hasOwn(APPROVED_PREVIEW_DEPENDENCIES, packageName)) {
        dependencies[packageName] = APPROVED_PREVIEW_DEPENDENCIES[packageName];
      }
    }
  }

  return dependencies;
};

const previewExtensionByLanguage: Record<string, string> = {
  css: "css",
  html: "html",
  javascript: "js",
  js: "js",
  jsx: "jsx",
  json: "json",
  less: "less",
  scss: "scss",
  ts: "ts",
  tsx: "tsx",
  typescript: "ts",
};

const highlightedExtensions = new Set([
  "css",
  "html",
  "js",
  "jsx",
  "json",
  "less",
  "scss",
  "ts",
  "tsx",
]);

const getHighlightedFilePath = (part: ContentPart) => {
  const extension = getPartExtension(part);
  if (!extension || !highlightedExtensions.has(extension)) return null;
  return part.filePath
    ? normalizePreviewPath(part.filePath)
    : `/snippet.${extension}`;
};

const isPackageManifest = (part: ContentPart) =>
  part.filePath?.split("/").pop()?.replace(/['"]+$/, "") === "package.json";

const getReactPartPath = (part: ContentPart, index: number) => {
  if (isPackageManifest(part)) return null;

  if (part.filePath) {
    const path = normalizePreviewPath(part.filePath);
    if (path.startsWith("/src/") || path.startsWith("/public/")) return path;
    if (getPartExtension(part) === "html") return `/public/${path.split("/").pop()}`;
    return `/src${path}`;
  }

  const extension = previewExtensionByLanguage[part.language || ""];
  if (!extension) return null;

  if (isRunnableComponent(part)) {
    return `/src/${getComponentName(part) || `Component${index}`}.${extension}`;
  }

  if (isExplicitReactEntry(part)) return `/src/main.${extension}`;

  return `/src/generated-${index}.${extension}`;
};

const getStaticPartPath = (part: ContentPart, index: number) => {
  if (isPackageManifest(part)) return null;
  if (part.filePath) return normalizePreviewPath(part.filePath);

  const extension = previewExtensionByLanguage[part.language || ""];
  if (!extension) return null;
  if (extension === "html") return "/index.html";
  if (extension === "css") return `/styles-${index}.css`;
  return `/script-${index}.${extension}`;
};

const getCssImportPaths = (files: Record<string, string>) =>
  Object.keys(files).filter((path) => /\.(?:css|less|scss)$/i.test(path));

const TAILWIND_PLAY_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.0/dist/index.global.js";

const TAILWIND_ASYNC_LOADER = [
  'if (!document.querySelector("script[data-wisp-tailwind]")) {',
  '  const tailwindScript = document.createElement("script");',
  `  tailwindScript.src = ${JSON.stringify(TAILWIND_PLAY_CDN_URL)};`,
  "  tailwindScript.async = true;",
  '  tailwindScript.dataset.wispTailwind = "true";',
  "  document.head.appendChild(tailwindScript);",
  "}",
].join("\n");

const sanitizePreviewStylesheet = (content: string) =>
  content
    .replace(/^\s*@tailwind\s+(?:base|components|utilities)\s*;\s*$/gim, "")
    .replace(/^\s*@import\s+["']tailwindcss["']\s*;\s*$/gim, "")
    .trim();

const buildPreviewApp = (
  selectedPath: string,
  cssPaths: string[],
) => {
  const componentPath = `.${selectedPath}`.replace(/\.(tsx|jsx|ts|js)$/, "");

  return [
    ...cssPaths.map((path) => `import ${JSON.stringify(`.${path}`)};`),
    `import GeneratedComponent from ${JSON.stringify(componentPath)};`,
    "",
    TAILWIND_ASYNC_LOADER,
    "",
    "export default function App() {",
    "  return <GeneratedComponent />;",
    "}",
  ].join("\n");
};

const createRuntimeKey = (
  files: Record<string, string>,
  template: PreviewTemplate,
  entry?: string,
) => {
  let hash = 0;
  const input = `${template}:${entry || ""}:${Object.entries(files)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([path, code]) => `${path}\0${code}`)
    .join("\0")}`;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }

  return `${template}-${Math.abs(hash)}`;
};

const createRunnableProject = ({
  declaredDependencies,
  entry,
  fileCount,
  files,
  label,
  template,
}: {
  declaredDependencies: Record<string, string>;
  entry?: string;
  fileCount: number;
  files: Record<string, string>;
  label: string;
  template: PreviewTemplate;
}) => ({
  dependencies: collectRuntimeDependencies(files, declaredDependencies),
  entry,
  fileCount,
  files,
  label,
  runtimeKey: createRuntimeKey(files, template, entry),
  template,
});

const injectStaticResources = (
  html: string,
  files: Record<string, string>,
) => {
  const escapeHtmlAttribute = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const styleTags = Object.keys(files)
    .filter((path) => /\.css$/i.test(path))
    .filter((path) => !html.includes(path) && !html.includes(path.slice(1)))
    .map(
      (path) =>
        `<link rel="stylesheet" href="${escapeHtmlAttribute(path)}" />`,
    )
    .join("\n");
  const scriptTags = Object.keys(files)
    .filter((path) => /\.(?:js|mjs)$/i.test(path))
    .filter((path) => !html.includes(path) && !html.includes(path.slice(1)))
    .map(
      (path) =>
        `<script type="module" src="${escapeHtmlAttribute(path)}"></script>`,
    )
    .join("\n");
  const headTags = [
    `<script async data-wisp-tailwind src="${TAILWIND_PLAY_CDN_URL}"></script>`,
    styleTags,
  ]
    .filter(Boolean)
    .join("\n");

  let runnableHtml = html.includes("</head>")
    ? html.replace("</head>", `${headTags}\n</head>`)
    : `${headTags}\n${html}`;
  if (scriptTags) {
    runnableHtml = runnableHtml.includes("</body>")
      ? runnableHtml.replace("</body>", `${scriptTags}\n</body>`)
      : `${runnableHtml}\n${scriptTags}`;
  }

  return runnableHtml;
};

const buildStaticFiles = (parts: ContentPart[], selectedIndex: number) => {
  const selectedPart = parts[selectedIndex];
  if (!selectedPart || !isHtmlPart(selectedPart)) return null;

  const files: Record<string, string> = {};
  const partPaths = new Map<number, string>();

  for (const [index, part] of parts.entries()) {
    if (part.type !== "code") continue;
    const path = getStaticPartPath(part, index);
    if (!path) continue;
    files[path] = /\.css$/i.test(path)
      ? sanitizePreviewStylesheet(part.content)
      : part.content;
    partPaths.set(index, path);
  }

  const selectedPath = partPaths.get(selectedIndex) ?? "/index.html";
  files["/index.html"] = injectStaticResources(selectedPart.content, files);

  return createRunnableProject({
    declaredDependencies: collectDeclaredDependencies(parts),
    fileCount: new Set(partPaths.values()).size,
    files,
    label: selectedPart.filePath || selectedPath,
    template: "static",
  });
};

const buildReactFiles = (parts: ContentPart[], selectedIndex: number) => {
  const files: Record<string, string> = {};
  const partPaths = new Map<number, string>();

  for (const [index, part] of parts.entries()) {
    if (part.type !== "code") continue;
    const path = getReactPartPath(part, index);
    if (!path) continue;
    files[path] = /\.(?:css|less|scss)$/i.test(path)
      ? sanitizePreviewStylesheet(part.content)
      : part.content;
    partPaths.set(index, path);
  }

  const selectedPart = parts[selectedIndex];
  if (
    !selectedPart ||
    (!isRunnableComponent(selectedPart) && !isExplicitReactEntry(selectedPart))
  ) {
    return null;
  }

  const explicitEntry = Array.from(partPaths.entries()).find(([index]) =>
    isExplicitReactEntry(parts[index]),
  )?.[1];
  const previewLabel =
    selectedPart.filePath || partPaths.get(selectedIndex) || "React preview";

  if (explicitEntry) {
    files[explicitEntry] = `${files[explicitEntry]}\n\n${TAILWIND_ASYNC_LOADER}`;
    return createRunnableProject({
      declaredDependencies: collectDeclaredDependencies(parts),
      entry: explicitEntry,
      fileCount: new Set(partPaths.values()).size,
      files,
      label: previewLabel,
      template: "react-ts",
    });
  }

  const selectedPath =
    partPaths.get(selectedIndex) ??
    `/src/${getComponentName(selectedPart) || `Component${selectedIndex}`}.tsx`;
  const componentName = getComponentName(selectedPart);
  let componentCode = selectedPart.content;
  if (!/export\s+default/.test(componentCode)) {
    if (!componentName) return null;
    componentCode = `${componentCode}\n\nexport default ${componentName};`;
  }
  files[selectedPath] = componentCode;
  files["/App.tsx"] = buildPreviewApp(selectedPath, getCssImportPaths(files));

  return createRunnableProject({
    declaredDependencies: collectDeclaredDependencies(parts),
    fileCount: new Set(partPaths.values()).size,
    files,
    label: previewLabel,
    template: "react-ts",
  });
};

const buildRunnableFiles = (parts: ContentPart[], selectedIndex: number) => {
  const selectedPart = parts[selectedIndex];
  return selectedPart && isHtmlPart(selectedPart)
    ? buildStaticFiles(parts, selectedIndex)
    : buildReactFiles(parts, selectedIndex);
};

const getRunnablePartIndexes = (parts: ContentPart[]) =>
  parts.reduce<number[]>((indexes, part, index) => {
    if (
      isHtmlPart(part) ||
      isRunnableComponent(part) ||
      isExplicitReactEntry(part)
    ) {
      indexes.push(index);
    }
    return indexes;
  }, []);

const CopyControl = ({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
      onClick={copy}
      type="button"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
};

const StreamingCodeIndicator = () => (
  <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-normal text-emerald-400">
    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
    Streaming
  </span>
);

const PlainCode = ({ code }: { code: string }) => (
  <pre className="m-0 p-4 text-[13px] leading-6 text-zinc-200">
    <code>{code}</code>
  </pre>
);

const HighlightedCode = ({
  constrainHeight = true,
  part,
}: {
  constrainHeight?: boolean;
  part: ContentPart;
}) => {
  const filePath = getHighlightedFilePath(part);

  return (
    <div
      className={`subtle-scrollbar ${constrainHeight ? "max-h-96 overflow-auto" : "overflow-x-auto"} bg-zinc-950 text-[13px] leading-6`}
    >
      {filePath && part.complete !== false ? (
        <Suspense fallback={<PlainCode code={part.content} />}>
          <SandpackHighlightedCode
            code={part.content}
            filePath={filePath}
          />
        </Suspense>
      ) : (
        <PlainCode code={part.content} />
      )}
    </div>
  );
};

const CommandBlock = ({
  constrainHeight = true,
  part,
}: {
  constrainHeight?: boolean;
  part: ContentPart;
}) => (
  <div className="my-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100">
    <div className="flex h-10 items-center justify-between border-b border-zinc-800 px-3">
      <span className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        <Terminal className="size-4" />
        Terminal
        {part.complete === false && <StreamingCodeIndicator />}
      </span>
      <CopyControl value={part.content} />
    </div>
    <pre
      className={`subtle-scrollbar ${constrainHeight ? "max-h-72 overflow-auto" : "overflow-x-auto"} p-4 text-[13px] leading-6 text-emerald-300`}
    >
      <code>{part.content}</code>
    </pre>
  </div>
);

const CodeBlock = ({
  constrainHeight = true,
  part,
  onRun,
}: {
  constrainHeight?: boolean;
  part: ContentPart;
  onRun?: () => void;
}) => (
  <div className="my-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100">
    <div className="flex h-10 items-center justify-between border-b border-zinc-800 px-3">
      <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-zinc-400">
        <Code2 className="size-4 shrink-0" />
        <span className="truncate">
          {part.filePath || part.language || "Code"}
        </span>
        {part.complete === false && <StreamingCodeIndicator />}
      </span>
      <div className="flex items-center gap-1">
        {onRun && (
          <button
            aria-label="Run component"
            className="flex size-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white"
            onClick={onRun}
            title="Run component"
            type="button"
          >
            <Play className="size-3.5 fill-current" />
          </button>
        )}
        <CopyControl value={part.content} />
      </div>
    </div>
    <HighlightedCode constrainHeight={constrainHeight} part={part} />
  </div>
);

const RunnablePreview = ({
  project,
  theme,
  onClose,
}: {
  project: {
    dependencies: Record<string, string>;
    entry?: string;
    fileCount: number;
    files: Record<string, string>;
    label: string;
    runtimeKey: string;
    template: PreviewTemplate;
  };
  theme: "light" | "dark";
  onClose: () => void;
}) => {
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex bg-black/60 ${
        fullScreen ? "p-0" : "items-center justify-center p-3 sm:p-6"
      }`}
      onMouseDown={onClose}
    >
      <section
        className={`overflow-hidden border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 ${
          fullScreen
            ? "h-dvh w-screen rounded-none"
            : "w-full max-w-6xl rounded-xl"
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-11 items-center justify-between border-b border-zinc-200 px-3 dark:border-zinc-700">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate">{project.label}</span>
            {project.fileCount > 1 && (
              <span className="shrink-0 text-xs font-normal text-zinc-500">
                {project.fileCount} files
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            <IconButton
              label={fullScreen ? "Exit full screen" : "Open full screen"}
              onClick={() => setFullScreen((current) => !current)}
            >
              {fullScreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </IconButton>
            <IconButton label="Close preview" onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          </div>
        </div>
        <Suspense
          fallback={
            <div className="flex h-[min(72dvh,640px)] items-center justify-center text-sm text-zinc-500">
              Rendering…
            </div>
          }
        >
          <SandpackRuntime
            dependencies={project.dependencies}
            entry={project.entry}
            files={project.files}
            height={fullScreen ? "calc(100dvh - 44px)" : "min(72dvh, 640px)"}
            key={project.runtimeKey}
            template={project.template}
            theme={theme}
          />
        </Suspense>
      </section>
    </div>
  );
};

const AssistantContent = ({
  content,
  constrainCodeHeight = true,
  streaming,
  theme,
}: {
  content: string;
  constrainCodeHeight?: boolean;
  streaming: boolean;
  theme: "light" | "dark";
}) => {
  const parts = useMemo(() => parseMessageContent(content), [content]);
  const runnableIndexes = useMemo(() => getRunnablePartIndexes(parts), [parts]);
  const [runningPartIndex, setRunningPartIndex] = useState<number | null>(null);
  const runnableProject = useMemo(
    () =>
      runningPartIndex === null
        ? null
        : buildRunnableFiles(parts, runningPartIndex),
    [parts, runningPartIndex],
  );

  if (!content) return <>{streaming ? "Thinking…" : ""}</>;

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "command") {
          return (
            <CommandBlock
              constrainHeight={constrainCodeHeight}
              key={`command-${index}`}
              part={part}
            />
          );
        }
        if (part.type === "code") {
          return (
            <CodeBlock
              constrainHeight={constrainCodeHeight}
              key={`code-${index}`}
              onRun={
                !streaming && runnableIndexes.includes(index)
                  ? () => setRunningPartIndex(index)
                  : undefined
              }
              part={part}
            />
          );
        }
        if (!part.content.trim()) return null;
        return (
          <div className="whitespace-pre-wrap" key={`text-${index}`}>
            {part.content.trim()}
          </div>
        );
      })}
      {runnableProject && (
        <RunnablePreview
          onClose={() => setRunningPartIndex(null)}
          project={runnableProject}
          theme={theme}
        />
      )}
    </>
  );
};

const IconButton = ({
  label,
  children,
  className = "",
  disabled = false,
  onClick,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) => (
  <button
    aria-label={label}
    className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-200/70 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${className}`}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

const SidebarItem = ({
  icon,
  label,
  collapsed,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  collapsed: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) => (
  <button
    className={`flex h-10 w-full items-center rounded-lg text-sm text-zinc-800 transition-colors hover:bg-zinc-200/70 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-800 ${
      collapsed ? "justify-center px-0" : "gap-3 px-3"
    }`}
    disabled={disabled}
    onClick={onClick}
    title={collapsed ? label : undefined}
    type="button"
  >
    <span className="shrink-0">{icon}</span>
    {!collapsed && <span className="truncate">{label}</span>}
  </button>
);

const ProjectSection = ({
  projects,
  selectedProjectId,
  busyProjectId,
  creating,
  loading,
  onCreate,
  onDelete,
  onRename,
  onSelect,
}: {
  projects: Project[];
  selectedProjectId: string | null;
  busyProjectId: string | null;
  creating: boolean;
  loading: boolean;
  onCreate: (name: string) => Promise<boolean>;
  onDelete: (project: Project) => Promise<boolean>;
  onRename: (project: Project, name: string) => Promise<boolean>;
  onSelect: (projectId: string | null) => void;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const submitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName || creating) return;

    if (await onCreate(nextName)) {
      setName("");
      setShowForm(false);
    }
  };

  const submitRename = async (
    event: FormEvent<HTMLFormElement>,
    project: Project,
  ) => {
    event.preventDefault();
    const nextName = editingName.trim();
    if (!nextName || busyProjectId) return;
    if (nextName === project.name || (await onRename(project, nextName))) {
      setEditingProjectId(null);
      setEditingName("");
    }
  };

  return (
    <section className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <div className="mb-1 flex items-center justify-between px-3">
        <button
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          onClick={() => onSelect(null)}
          type="button"
        >
          Projects
        </button>
        <button
          aria-label={showForm ? "Cancel project creation" : "Create project"}
          className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          disabled={creating}
          onClick={() => setShowForm((current) => !current)}
          type="button"
        >
          {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
        </button>
      </div>

      {showForm && (
        <form className="mb-2 flex gap-1 px-2" onSubmit={submitProject}>
          <input
            autoFocus
            className="h-8 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            disabled={creating}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            value={name}
          />
          <button
            className="h-8 rounded-md bg-zinc-900 px-2 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
            disabled={!name.trim() || creating}
            type="submit"
          >
            {creating ? "…" : "Add"}
          </button>
        </form>
      )}

      <div className="space-y-0.5">
        <button
          className={`flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors ${
            selectedProjectId === null
              ? "bg-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
          }`}
          onClick={() => onSelect(null)}
          type="button"
        >
          <Folder className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">All chats</span>
        </button>

        {loading ? (
          <div className="mx-3 my-2 h-7 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
        ) : (
          projects.map((project) => {
            const busy = busyProjectId === project.id;

            if (editingProjectId === project.id) {
              return (
                <form
                  className="flex items-center gap-1 px-1"
                  key={project.id}
                  onSubmit={(event) => void submitRename(event, project)}
                >
                  <input
                    autoFocus
                    className="h-8 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    disabled={busy}
                    maxLength={60}
                    onChange={(event) => setEditingName(event.target.value)}
                    value={editingName}
                  />
                  <button
                    aria-label="Save project name"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-200 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    disabled={busy || !editingName.trim()}
                    type="submit"
                  >
                    <Check className="size-4" />
                  </button>
                  <IconButton
                    className="!size-8"
                    disabled={busy}
                    label="Cancel rename"
                    onClick={() => setEditingProjectId(null)}
                  >
                    <X className="size-4" />
                  </IconButton>
                </form>
              );
            }

            return (
              <div className="group relative" key={project.id}>
                <button
                  className={`flex h-9 w-full items-center gap-2 rounded-lg pl-3 pr-16 text-left text-sm transition-colors ${
                    selectedProjectId === project.id
                      ? "bg-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
                  }`}
                  onClick={() => {
                    setOpenMenuId(null);
                    setConfirmDeleteId(null);
                    onSelect(project.id);
                  }}
                  type="button"
                >
                  <Folder className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    {project.name}
                  </span>
                </button>
                <span className="pointer-events-none absolute right-10 top-2.5 text-[11px] tabular-nums text-zinc-500 group-hover:opacity-0">
                  {project.sessionCount}
                </span>
                <button
                  aria-label={`Actions for ${project.name}`}
                  className={`absolute right-1 top-0.5 flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-300 disabled:opacity-40 dark:hover:bg-zinc-700 ${
                    openMenuId === project.id
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                  disabled={busy}
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setOpenMenuId((current) =>
                      current === project.id ? null : project.id,
                    );
                  }}
                  type="button"
                >
                  <Ellipsis className="size-4" />
                </button>

                {openMenuId === project.id && (
                  <div className="absolute right-1 top-9 z-30 w-48 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                    {confirmDeleteId === project.id ? (
                      <div className="p-2">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          Delete {project.name}?
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                          Its chats will stay under All chats.
                        </p>
                        <div className="mt-2 flex justify-end gap-1">
                          <button
                            className="h-7 rounded-md px-2 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            disabled={busy}
                            onClick={() => setConfirmDeleteId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                          <button
                            className="h-7 rounded-md bg-red-600 px-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
                            disabled={busy}
                            onClick={async () => {
                              if (await onDelete(project)) {
                                setOpenMenuId(null);
                                setConfirmDeleteId(null);
                              }
                            }}
                            type="button"
                          >
                            {busy ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          onClick={() => {
                            setEditingProjectId(project.id);
                            setEditingName(project.name);
                            setOpenMenuId(null);
                          }}
                          type="button"
                        >
                          <PenLine className="size-4" />
                          Rename
                        </button>
                        <button
                          className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          onClick={() => setConfirmDeleteId(project.id)}
                          type="button"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

const ChatHistory = ({
  chats,
  activeChatId,
  loading,
  busySessionId,
  onDelete,
  onRename,
  onSelect,
}: {
  chats: Chat[];
  activeChatId: string | null;
  loading: boolean;
  busySessionId: string | null;
  onDelete: (chat: Chat) => void;
  onRename: (chat: Chat) => void;
  onSelect: (id: string) => void;
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const groups: SessionGroup[] = [
    "Today",
    "Previous 7 days",
    "Previous 30 days",
    "Older",
  ];

  if (loading) {
    return (
      <div className="space-y-2 px-3 pt-5">
        <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="h-8 rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
      </div>
    );
  }

  if (!chats.length) {
    return (
      <p className="px-3 pt-4 text-xs leading-5 text-zinc-500">
        No chats here yet. Start a new chat to add one.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-5">
      {groups.map((group) => {
        const groupedChats = chats.filter((chat) => chat.group === group);
        if (!groupedChats.length) return null;

        return (
          <section key={group}>
            <h2 className="mb-1 px-3 text-xs font-medium text-zinc-500 dark:text-zinc-500">
              {group}
            </h2>
            <div className="space-y-0.5">
              {groupedChats.map((chat) => (
                <div className="group relative" key={chat.id}>
                  <button
                    className={`flex h-9 w-full items-center rounded-lg pl-3 pr-9 text-left text-sm transition-colors ${
                      activeChatId === chat.id
                        ? "bg-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
                    }`}
                    onClick={() => {
                      setOpenMenuId(null);
                      onSelect(chat.id);
                    }}
                    type="button"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {chat.title}
                    </span>
                  </button>
                  <button
                    aria-label={`Actions for ${chat.title}`}
                    className={`absolute right-1 top-0.5 flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700 ${
                      openMenuId === chat.id
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                    disabled={busySessionId === chat.id}
                    onClick={() =>
                      setOpenMenuId((current) =>
                        current === chat.id ? null : chat.id,
                      )
                    }
                    type="button"
                  >
                    <Ellipsis className="size-4" />
                  </button>

                  {openMenuId === chat.id && (
                    <div className="absolute right-1 top-9 z-20 w-36 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                      <button
                        className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        onClick={() => {
                          setOpenMenuId(null);
                          onRename(chat);
                        }}
                        type="button"
                      >
                        <PenLine className="size-4" />
                        Rename
                      </button>
                      <button
                        className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        onClick={() => {
                          setOpenMenuId(null);
                          onDelete(chat);
                        }}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const getUserInitials = (fullname?: string) =>
  fullname
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

const getSafeAvatarUrl = (avatar?: string | null) => {
  if (!avatar || typeof window === "undefined") return null;

  try {
    const url = new URL(avatar, window.location.origin);
    if (url.protocol === "https:" || url.origin === window.location.origin) {
      return url.href;
    }
  } catch {
    // Invalid or unsafe avatar URLs fall back to user initials.
  }

  return null;
};

const CollapsedProfile = () => {
  const currentUser = useUserStore((state) => state.currentUser);
  const avatarUrl = getSafeAvatarUrl(currentUser?.avatar);

  return (
    <button
      className="flex size-10 items-center justify-center rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
      title={currentUser?.fullname || "Account"}
      type="button"
    >
      {avatarUrl ? (
        <img
          alt=""
          className="size-8 rounded-full object-cover"
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={avatarUrl}
        />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-white dark:bg-zinc-200 dark:text-zinc-900">
          {getUserInitials(currentUser?.fullname)}
        </span>
      )}
    </button>
  );
};

const ProfileMenu = ({
  theme,
  onToggleTheme,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearCurrentUser = useUserStore((state) => state.clearCurrentUser);
  const currentUser = useUserStore((state) => state.currentUser);
  const avatarUrl = getSafeAvatarUrl(currentUser?.avatar);
  const initials = getUserInitials(currentUser?.fullname);
  const logoutMutation = useMutation<null, Error>({
    mutationKey: ["user", "logout"],
    mutationFn: () => apiRequest<null>("/user/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: sessionQueryKeys.all });
      queryClient.removeQueries({ queryKey: sessionQueryKeys.models });
      queryClient.removeQueries({ queryKey: projectQueryKeys.all });
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
      window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
      clearCurrentUser();
      toast.success("Logged out successfully");
      navigate("/login", { replace: true });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="relative border-t border-zinc-200 p-2 dark:border-zinc-800">
      {open && (
        <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <button
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            type="button"
          >
            <Settings className="size-4" />
            Settings
          </button>
          <button
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={onToggleTheme}
            type="button"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            disabled={logoutMutation.isPending}
            onClick={() => {
              setOpen(false);
              logoutMutation.mutate();
            }}
            type="button"
          >
            <LogOut className="size-4" />
            {logoutMutation.isPending ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}

      <button
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {avatarUrl ? (
          <img
            alt=""
            className="size-8 shrink-0 rounded-full object-cover"
            decoding="async"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={avatarUrl}
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-white dark:bg-zinc-200 dark:text-zinc-900">
            {initials}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {currentUser?.fullname || "Account"}
          </span>
          <span className="block truncate text-xs text-zinc-500">
            {currentUser?.email || "Signed in"}
          </span>
        </span>
        <ChevronDown
          className={`size-4 text-zinc-500 ${open ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
};

const Sidebar = ({
  chats,
  projects,
  activeChatId,
  selectedProjectId,
  collapsed,
  mobileOpen,
  theme,
  loadingChats,
  loadingProjects,
  creatingProject,
  creatingSession,
  busyProjectId,
  busySessionId,
  onCloseMobile,
  onCreateProject,
  onDeleteProject,
  onDeleteChat,
  onNewChat,
  onRenameProject,
  onRenameChat,
  onSelectChat,
  onSelectProject,
  onToggle,
  onToggleTheme,
}: {
  chats: Chat[];
  projects: Project[];
  activeChatId: string | null;
  selectedProjectId: string | null;
  collapsed: boolean;
  mobileOpen: boolean;
  theme: "light" | "dark";
  loadingChats: boolean;
  loadingProjects: boolean;
  creatingProject: boolean;
  creatingSession: boolean;
  busyProjectId: string | null;
  busySessionId: string | null;
  onCloseMobile: () => void;
  onCreateProject: (name: string) => Promise<boolean>;
  onDeleteProject: (project: Project) => Promise<boolean>;
  onDeleteChat: (chat: Chat) => void;
  onNewChat: () => void;
  onRenameProject: (project: Project, name: string) => Promise<boolean>;
  onRenameChat: (chat: Chat) => void;
  onSelectChat: (id: string) => void;
  onSelectProject: (projectId: string | null) => void;
  onToggle: () => void;
  onToggleTheme: () => void;
}) => (
  <>
    {mobileOpen && (
      <button
        aria-label="Close sidebar"
        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        onClick={onCloseMobile}
        type="button"
      />
    )}

    <aside
      className={`fixed inset-y-0 left-0 z-40 flex border-r border-zinc-200 bg-zinc-100 transition-[width,transform] duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:relative lg:translate-x-0 ${
        collapsed ? "lg:w-[68px]" : "lg:w-[280px]"
      } ${mobileOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full"}`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={`flex h-14 items-center ${collapsed ? "lg:justify-center lg:px-2" : "justify-between px-3"}`}
        >
          <button
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-950 dark:text-white ${collapsed ? "lg:hidden" : ""}`}
            disabled={creatingSession}
            onClick={onNewChat}
            type="button"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-950">
              W
            </span>
            Wisp
          </button>

          <div className="flex items-center gap-1">
            <IconButton
              className="lg:hidden"
              label="Close sidebar"
              onClick={onCloseMobile}
            >
              <X className="size-5" />
            </IconButton>
            <IconButton
              label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onToggle}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-5" />
              ) : (
                <PanelLeftClose className="size-5" />
              )}
            </IconButton>
          </div>
        </div>

        <nav className="px-2">
          <SidebarItem
            collapsed={collapsed && !mobileOpen}
            disabled={creatingSession}
            icon={<SquarePen className="size-[18px]" />}
            label={creatingSession ? "Creating chat..." : "New chat"}
            onClick={onNewChat}
          />
          <SidebarItem
            collapsed={collapsed && !mobileOpen}
            icon={<Search className="size-[18px]" />}
            label="Search chats"
          />
          <SidebarItem
            collapsed={collapsed && !mobileOpen}
            icon={<Library className="size-[18px]" />}
            label="Library"
          />
          {collapsed && !mobileOpen && (
            <SidebarItem
              collapsed
              icon={<Folder className="size-[18px]" />}
              label="Projects"
              onClick={onToggle}
            />
          )}
        </nav>

        <div className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {(!collapsed || mobileOpen) && (
            <>
              <ProjectSection
                busyProjectId={busyProjectId}
                creating={creatingProject}
                loading={loadingProjects}
                onCreate={onCreateProject}
                onDelete={onDeleteProject}
                onRename={onRenameProject}
                onSelect={onSelectProject}
                projects={projects}
                selectedProjectId={selectedProjectId}
              />
              <ChatHistory
                activeChatId={activeChatId}
                busySessionId={busySessionId}
                chats={chats}
                loading={loadingChats}
                onDelete={onDeleteChat}
                onRename={onRenameChat}
                onSelect={onSelectChat}
              />
            </>
          )}
        </div>

        {collapsed && !mobileOpen ? (
          <div className="hidden border-t border-zinc-200 p-2 dark:border-zinc-800 lg:block">
            <CollapsedProfile />
          </div>
        ) : (
          <ProfileMenu theme={theme} onToggleTheme={onToggleTheme} />
        )}
      </div>
    </aside>
  </>
);

const MessageBubble = memo(function MessageBubble({
  constrainCodeHeight = true,
  hideAvatar = false,
  message,
  streaming = false,
  theme,
}: {
  constrainCodeHeight?: boolean;
  hideAvatar?: boolean;
  message: Message;
  streaming?: boolean;
  theme: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);

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
          theme={theme}
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
          <IconButton label="Good response">
            <ThumbsUp className="size-4" />
          </IconButton>
          <IconButton label="Bad response">
            <ThumbsDown className="size-4" />
          </IconButton>
          <IconButton label="More actions">
            <Ellipsis className="size-4" />
          </IconButton>
        </div>
      )}
    </div>
  );
});

const BranchResponseCard = ({
  fullscreen = false,
  label,
  message,
  modelId,
  onToggleFullscreen,
  streaming,
  theme,
}: {
  fullscreen?: boolean;
  label: string;
  message: Message;
  modelId?: string | null;
  onToggleFullscreen: () => void;
  streaming: boolean;
  theme: "light" | "dark";
}) => {
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
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${
        fullscreen
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
          onClick={onToggleFullscreen}
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
          streaming={streaming}
          theme={theme}
        />
      </div>
    </article>
  );
};

const ConversationMessages = ({
  messages,
  models,
  streamingMessageIds,
  theme,
}: {
  messages: Message[];
  models: ModelOption[];
  streamingMessageIds: string[];
  theme: "light" | "dark";
}) => {
  const [fullscreenMessageId, setFullscreenMessageId] = useState<string | null>(
    null,
  );
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
                streaming={streamingIds.has(firstMessage.id)}
                theme={theme}
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
                    onToggleFullscreen={() => setFullscreenMessageId(message.id)}
                    streaming={streaming}
                    theme={theme}
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
              onToggleFullscreen={() => setFullscreenMessageId(null)}
              streaming={streamingIds.has(fullscreenMessage.id)}
              theme={theme}
            />
          </div>
        </div>
      )}
    </>
  );
};

const EmptyState = ({ onPrompt }: { onPrompt: (prompt: string) => void }) => {
  const suggestions = [
    {
      icon: <ImageIcon className="size-5" />,
      label: "Create a landing page",
      prompt: "Create a clean landing page for my new product",
    },
    {
      icon: <PenLine className="size-5" />,
      label: "Design a portfolio",
      prompt: "Help me design a simple personal portfolio",
    },
    {
      icon: <Globe2 className="size-5" />,
      label: "Build a web app",
      prompt: "Build a responsive dashboard for my web app",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-24 pt-20">
      <div className="mb-6 flex size-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
        <Sparkles className="size-5" />
      </div>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
        What do you want to build?
      </h1>
      <p className="mt-3 max-w-md text-center text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        Describe your idea and Wisp will help you turn it into a working
        website.
      </p>

      <div className="mt-8 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
        {suggestions.map((suggestion) => (
          <button
            className="flex min-h-24 flex-col items-start justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            key={suggestion.label}
            onClick={() => onPrompt(suggestion.prompt)}
            type="button"
          >
            <span className="text-zinc-500 dark:text-zinc-400">
              {suggestion.icon}
            </span>
            <span>{suggestion.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ModelSelector = ({
  disabled,
  fallbackModel,
  loading,
  models,
  onChange,
  provider,
  value,
}: {
  disabled: boolean;
  fallbackModel: string;
  loading: boolean;
  models: ModelOption[];
  onChange: (model: string) => void;
  provider: string;
  value: string;
}) => {
  const [open, setOpen] = useState(false);
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const stored = JSON.parse(
        window.localStorage.getItem(FAVORITE_MODELS_STORAGE_KEY) ?? "[]",
      ) as unknown;
      return Array.isArray(stored)
        ? stored.filter((model): model is string => typeof model === "string")
        : [];
    } catch {
      return [];
    }
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const favoriteModels = useMemo(
    () => new Set(favoriteModelIds),
    [favoriteModelIds],
  );
  const groupedModels = useMemo(
    () => ({
      favorites: models.filter((model) => favoriteModels.has(model.id)),
      others: models.filter((model) => !favoriteModels.has(model.id)),
    }),
    [favoriteModels, models],
  );
  const selectedModel =
    models.find((model) => model.id === value) ??
    models.find((model) => model.id === fallbackModel) ??
    models[0];

  const toggleFavorite = (modelId: string) => {
    setFavoriteModelIds((current) => {
      const next = current.includes(modelId)
        ? current.filter((id) => id !== modelId)
        : [...current, modelId];
      window.localStorage.setItem(
        FAVORITE_MODELS_STORAGE_KEY,
        JSON.stringify(next),
      );
      return next;
    });
  };

  const renderModelOption = (model: ModelOption) => (
    <div
      aria-selected={model.id === selectedModel?.id}
      className={`group flex w-full items-center rounded-lg text-sm ${
        model.id === selectedModel?.id
          ? "bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-white"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
      key={model.id}
      role="option"
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
        onClick={() => {
          onChange(model.id);
          setOpen(false);
        }}
        type="button"
      >
        <ModelLogo
          className="size-4 shrink-0"
          label={model.label}
          modelId={model.id}
        />
        <span className="truncate">{model.label}</span>
      </button>
      <button
        aria-label={`${favoriteModels.has(model.id) ? "Remove" : "Add"} ${model.label} ${favoriteModels.has(model.id) ? "from" : "to"} favorites`}
        aria-pressed={favoriteModels.has(model.id)}
        className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200 hover:text-amber-500 dark:hover:bg-zinc-700"
        onClick={() => toggleFavorite(model.id)}
        title={
          favoriteModels.has(model.id)
            ? "Remove from favorites"
            : "Add to favorites"
        }
        type="button"
      >
        <Star
          className={`size-3.5 ${
            favoriteModels.has(model.id)
              ? "fill-amber-400 text-amber-400"
              : ""
          }`}
        />
      </button>
    </div>
  );

  useEffect(() => {
    if (!open) return;

    const close = (event: globalThis.MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex max-w-28 items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 sm:max-w-48"
        disabled={disabled || loading || !selectedModel}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {selectedModel && favoriteModels.has(selectedModel.id) && (
          <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
        )}
        {selectedModel && (
          <ModelLogo
            className="size-4 shrink-0"
            label={selectedModel.label}
            modelId={selectedModel.id}
          />
        )}
        <span className="truncate">
          {loading ? "Loading models…" : (selectedModel?.label ?? "No models")}
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute bottom-[calc(100%+8px)] right-0 z-50 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white p-2 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          role="listbox"
        >
          <p className="px-2 pb-1.5 pt-1 text-xs font-semibold text-violet-500">
            {provider}
          </p>
          <div className="subtle-scrollbar max-h-80 overflow-y-auto">
            {groupedModels.favorites.length > 0 && (
              <div className="mb-1 border-b border-zinc-200 pb-1 dark:border-zinc-700">
                <p className="px-2 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Favorites
                </p>
                {groupedModels.favorites.map(renderModelOption)}
              </div>
            )}
            <div>{groupedModels.others.map(renderModelOption)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const BranchModelSelector = ({
  disabled,
  loading,
  models,
  onChange,
  provider,
  value,
}: {
  disabled: boolean;
  loading: boolean;
  models: ModelOption[];
  onChange: (models: string[]) => void;
  provider: string;
  value: string[];
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionHint, setSelectionHint] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => new Set(value), [value]);
  const filteredModels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return models;
    return models.filter(
      (model) =>
        model.label.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query),
    );
  }, [models, searchQuery]);

  const toggleModel = (modelId: string) => {
    setSelectionHint(null);
    if (selected.has(modelId)) {
      if (value.length <= MIN_BRANCH_MODELS) {
        setSelectionHint(`Branching needs at least ${MIN_BRANCH_MODELS} models.`);
        return;
      }
      onChange(value.filter((id) => id !== modelId));
      return;
    }

    if (value.length >= MAX_BRANCH_MODELS) {
      setSelectionHint(`You can compare up to ${MAX_BRANCH_MODELS} models.`);
      return;
    }
    onChange([...value, modelId]);
  };

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectionHint(null);
      return;
    }

    const close = (event: globalThis.MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex max-w-40 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:max-w-48"
        disabled={disabled || loading || models.length < MIN_BRANCH_MODELS}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <GitBranch className="size-3.5 shrink-0" />
        <span className="truncate">
          {loading ? "Loading models…" : `${value.length} selected`}
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+10px)] right-0 z-50 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div>
              <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                Choose branch models
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Select {MIN_BRANCH_MODELS}–{MAX_BRANCH_MODELS} from {provider}
              </p>
            </div>
            <IconButton label="Close model picker" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </IconButton>
          </div>
          <div className="p-3">
            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
              <Search className="size-4 shrink-0 text-zinc-400" />
              <input
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search models"
                value={searchQuery}
              />
              <span className="shrink-0 text-[11px] font-medium text-zinc-500">
                {value.length}/{MAX_BRANCH_MODELS}
              </span>
            </label>
          </div>
          <div
            aria-multiselectable="true"
            className="subtle-scrollbar grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto px-3 pb-3 sm:grid-cols-2"
            role="listbox"
          >
            {filteredModels.map((model) => {
              const checked = selected.has(model.id);
              const selectedIndex = value.indexOf(model.id);
              return (
                <button
                  aria-selected={checked}
                  className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    checked
                      ? "border-zinc-900 bg-zinc-900 font-medium text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  role="option"
                  type="button"
                >
                  <ModelLogo
                    className="size-5 shrink-0"
                    label={model.label}
                    modelId={model.id}
                  />
                  <span className="min-w-0 flex-1 truncate">{model.label}</span>
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold ${
                      checked
                        ? "border-white/40 bg-white/15 text-white dark:border-zinc-400 dark:bg-zinc-200 dark:text-zinc-950"
                        : "border-zinc-300 text-transparent dark:border-zinc-600"
                    }`}
                  >
                    {checked ? selectedIndex + 1 : "0"}
                  </span>
                </button>
              );
            })}
            {!filteredModels.length && (
              <p className="col-span-full py-6 text-center text-sm text-zinc-500">
                No models match “{searchQuery}”.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-[11px] text-zinc-500">
              {selectionHint ?? "Responses run together in the order selected."}
            </p>
            <button
              className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              onClick={() => setOpen(false)}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Composer = ({
  attachments,
  chatMode,
  branchModels,
  fallbackModel,
  modelLoading,
  models,
  value,
  sending,
  onAddFiles,
  onBranchModelsChange,
  onChange,
  onModeChange,
  onModelChange,
  onRemoveAttachment,
  onSubmit,
  provider,
  selectedModel,
}: {
  attachments: PendingAttachment[];
  chatMode: ChatMode;
  branchModels: string[];
  fallbackModel: string;
  modelLoading: boolean;
  models: ModelOption[];
  value: string;
  sending: boolean;
  onAddFiles: (files: File[]) => void;
  onBranchModelsChange: (models: string[]) => void;
  onChange: (value: string) => void;
  onModeChange: (mode: ChatMode) => void;
  onModelChange: (model: string) => void;
  onRemoveAttachment: (id: string) => void;
  onSubmit: () => void;
  provider: string;
  selectedModel: string;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelLabels = useMemo(
    () => new Map(models.map((model) => [model.id, model.label])),
    [models],
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [value]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <form className="mx-auto w-full max-w-3xl px-3 sm:px-4" onSubmit={submit}>
      <div className="rounded-[26px] border border-zinc-200 bg-white p-2 shadow-sm focus-within:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-600">
        {chatMode === "branching" && branchModels.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto px-2 pb-1 pt-1 [scrollbar-width:none]">
            {branchModels.map((modelId) => (
              <span
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 py-1 pl-1.5 pr-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                key={modelId}
              >
                <ModelLogo
                  className="size-4 shrink-0"
                  label={modelLabels.get(modelId) ?? modelId}
                  modelId={modelId}
                />
                <span className="max-w-28 truncate">
                  {modelLabels.get(modelId) ?? modelId}
                </span>
                <button
                  aria-label={`Remove ${modelLabels.get(modelId) ?? modelId}`}
                  className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-zinc-700 dark:hover:text-white"
                  disabled={branchModels.length <= MIN_BRANCH_MODELS}
                  onClick={() =>
                    onBranchModelsChange(
                      branchModels.filter((model) => model !== modelId),
                    )
                  }
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pb-1 pt-1">
            {attachments.map((attachment) => (
              <div
                className="flex max-w-56 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                key={attachment.id}
              >
                <FileText className="size-3.5 shrink-0 text-zinc-500" />
                <span className="min-w-0">
                  <span className="block truncate">{attachment.name}</span>
                  <span className="block text-[10px] text-zinc-500">
                    {formatFileSize(attachment.size)}
                  </span>
                </span>
                <button
                  aria-label={`Remove ${attachment.name}`}
                  className="ml-1 shrink-0 rounded p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-700 dark:hover:text-white"
                  disabled={sending}
                  onClick={() => onRemoveAttachment(attachment.id)}
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          aria-label="Message Wisp"
          className="max-h-40 min-h-11 w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-6 text-zinc-900 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed dark:text-zinc-100 dark:placeholder:text-zinc-500"
          disabled={sending}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            sending
              ? chatMode === "branching"
                ? "Your model branches are responding..."
                : "Wisp is responding..."
              : chatMode === "branching"
                ? "Ask every selected model..."
                : "Ask Wisp to build..."
          }
          ref={textareaRef}
          rows={1}
          value={value}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center">
            <button
              aria-label={
                chatMode === "branching"
                  ? "Turn off branching mode"
                  : "Turn on branching mode"
              }
              aria-pressed={chatMode === "branching"}
              className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                chatMode === "branching"
                  ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-950"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              }`}
              onClick={() =>
                onModeChange(chatMode === "branching" ? "normal" : "branching")
              }
              title={
                chatMode === "branching"
                  ? "Branching mode is on"
                  : "Branching mode is off"
              }
              type="button"
            >
              <GitBranch className="size-[18px]" />
            </button>
            <input
              accept="text/*,.bash,.c,.cpp,.css,.csv,.go,.h,.html,.java,.js,.json,.jsx,.less,.md,.mjs,.py,.scss,.sh,.sql,.svg,.toml,.ts,.tsx,.txt,.xml,.yaml,.yml,.zsh"
              className="hidden"
              disabled={sending}
              multiple
              onChange={(event) => {
                onAddFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />
            <IconButton
              disabled={sending || attachments.length >= MAX_ATTACHMENT_COUNT}
              label="Attach text or code files"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="size-5" />
            </IconButton>
            <span className="hidden px-2 text-xs text-zinc-500 sm:inline">
              {attachments.length
                ? `${attachments.length}/${MAX_ATTACHMENT_COUNT} files`
                : "Add files"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {chatMode === "branching" ? (
              <BranchModelSelector
                disabled={false}
                loading={modelLoading}
                models={models}
                onChange={onBranchModelsChange}
                provider={provider}
                value={branchModels}
              />
            ) : (
              <ModelSelector
                disabled={false}
                fallbackModel={fallbackModel}
                loading={modelLoading}
                models={models}
                onChange={onModelChange}
                provider={provider}
                value={selectedModel}
              />
            )}
            <IconButton disabled label="Voice input is not supported yet">
              <Mic className="size-5" />
            </IconButton>
            <button
              aria-label="Send message"
              className="flex size-9 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
              disabled={
                (!value.trim() && !attachments.length) ||
                sending ||
                (chatMode === "branching" &&
                  branchModels.length < MIN_BRANCH_MODELS)
              }
              type="submit"
            >
              <ArrowUp className="size-5" />
            </button>
          </div>
        </div>
      </div>
      <p className="py-2 text-center text-[11px] text-zinc-500 dark:text-zinc-500">
        Wisp can make mistakes. Check important information.
      </p>
    </form>
  );
};

const ChatPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: activeChatId } = useParams<{ id?: string }>();
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [composerValue, setComposerValue] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (window.localStorage.getItem(LANDING_DRAFT_STORAGE_KEY) ?? ""),
  );
  const [selectedModel, setSelectedModel] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (window.localStorage.getItem("wisp-selected-model") ?? ""),
  );
  const [chatMode, setChatMode] = useState<ChatMode>(() =>
    typeof window !== "undefined" &&
    window.localStorage.getItem(BRANCH_MODE_STORAGE_KEY) === "branching"
      ? "branching"
      : "normal",
  );
  const [selectedBranchModels, setSelectedBranchModels] = useState<string[]>(
    () => {
      if (typeof window === "undefined") return [];
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(BRANCH_MODELS_STORAGE_KEY) ?? "[]",
        ) as unknown;
        return Array.isArray(stored)
          ? stored.filter((model): model is string => typeof model === "string")
          : [];
      } catch {
        return [];
      }
    },
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () =>
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY),
  );
  const [streamingMessageIds, setStreamingMessageIds] = useState<string[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const hydratedGenerationRef = useRef<string | null>(null);
  const landingDraftConsumedRef = useRef(false);
  const shouldFollowStreamRef = useRef(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("wisp-sidebar-collapsed") === "true";
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const savedTheme = window.localStorage.getItem("wisp-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const modelsQuery = useQuery<ModelCatalog, Error>({
    queryKey: sessionQueryKeys.models,
    queryFn: () => apiRequest<ModelCatalog>("/session/models"),
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
  });

  const projectsQuery = useQuery<Project[], Error>({
    queryKey: projectQueryKeys.all,
    queryFn: () => apiRequest<Project[]>("/projects"),
  });

  const sessionsQuery = useQuery<Chat[], Error>({
    queryKey: sessionQueryKeys.all,
    queryFn: async () => {
      const sessions = await apiRequest<SessionSummary[]>("/session");
      return sortSessions(
        sessions.map((session) => normalizeSession(session, [])),
      );
    },
  });

  const activeSessionQuery = useQuery<Chat, Error>({
    queryKey: sessionQueryKeys.detail(activeChatId ?? "inactive"),
    enabled: Boolean(activeChatId),
    queryFn: async () => {
      if (!activeChatId) throw new Error("A session id is required");
      const session = await apiRequest<SessionDetails>(
        `/session/${encodeURIComponent(activeChatId)}`,
      );
      return normalizeSession(
        session,
        session.messages.map(normalizeMessage),
      );
    },
    refetchInterval: (query) =>
      isAwaitingPersistedAssistant(query.state.data) ? 2_000 : false,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const activeChat = activeChatId ? (activeSessionQuery.data ?? null) : null;
  const chats = useMemo(() => {
    const sessions = sessionsQuery.data ?? [];
    if (!activeChat) return sessions;
    return sortSessions([
      activeChat,
      ...sessions.filter((chat) => chat.id !== activeChat.id),
    ]);
  }, [activeChat, sessionsQuery.data]);
  const visibleChats = useMemo(
    () =>
      selectedProjectId
        ? chats.filter((chat) => chat.projectId === selectedProjectId)
        : chats,
    [chats, selectedProjectId],
  );

  const updateSessionMessages = (
    sessionId: string,
    update: (messages: Message[]) => Message[],
  ) => {
    queryClient.setQueryData<Chat>(
      sessionQueryKeys.detail(sessionId),
      (chat) => (chat ? { ...chat, messages: update(chat.messages) } : chat),
    );
  };

  const createProjectMutation = useMutation<Project, Error, string>({
    mutationKey: ["projects", "create"],
    retry: 0,
    mutationFn: (name) =>
      apiRequest<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: (project) => {
      queryClient.setQueryData<Project[]>(
        projectQueryKeys.all,
        (current = []) => [
          project,
          ...current.filter((item) => item.id !== project.id),
        ],
      );
      setSelectedProjectId(project.id);
      window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, project.id);
      navigate("/session");
      setMobileSidebarOpen(false);
      toast.success("Project created");
    },
    onError: (error) => setPageError(error.message),
  });

  const renameProjectMutation = useMutation<
    Project,
    Error,
    { project: Project; name: string }
  >({
    mutationKey: ["projects", "rename"],
    retry: 0,
    mutationFn: ({ project, name }) =>
      apiRequest<Project>(`/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    onSuccess: (project) => {
      queryClient.setQueryData<Project[]>(
        projectQueryKeys.all,
        (current = []) =>
          current.map((item) => (item.id === project.id ? project : item)),
      );
      toast.success("Project renamed");
    },
    onError: (error) => setPageError(error.message),
  });

  const deleteProjectMutation = useMutation<
    string,
    Error,
    { project: Project }
  >({
    mutationKey: ["projects", "delete"],
    retry: 0,
    mutationFn: async ({ project }) => {
      await apiRequest<{ id: string }>(
        `/projects/${encodeURIComponent(project.id)}`,
        { method: "DELETE" },
      );
      return project.id;
    },
    onSuccess: (projectId) => {
      queryClient.setQueryData<Project[]>(
        projectQueryKeys.all,
        (current = []) => current.filter((project) => project.id !== projectId),
      );
      queryClient.setQueryData<Chat[]>(
        sessionQueryKeys.all,
        (current = []) =>
          current.map((chat) =>
            chat.projectId === projectId ? { ...chat, projectId: null } : chat,
          ),
      );
      if (activeChatId) {
        queryClient.setQueryData<Chat>(
          sessionQueryKeys.detail(activeChatId),
          (chat) =>
            chat?.projectId === projectId ? { ...chat, projectId: null } : chat,
        );
      }
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
        window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
      }
      toast.success("Project deleted. Its chats are still available.");
    },
    onError: (error) => setPageError(error.message),
  });

  const createSessionMutation = useMutation<Chat, Error, string | null>({
    mutationKey: ["sessions", "create"],
    retry: 0,
    mutationFn: async (projectId) => {
      const session = await apiRequest<SessionDetails>("/session", {
        method: "POST",
        body: JSON.stringify({ projectId }),
      });
      return normalizeSession(session, []);
    },
    onSuccess: (chat) => {
      queryClient.setQueryData<Chat[]>(sessionQueryKeys.all, (current = []) =>
        sortSessions([
          chat,
          ...current.filter((item) => item.id !== chat.id),
        ]),
      );
      queryClient.setQueryData(sessionQueryKeys.detail(chat.id), chat);
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
    },
    onError: (error) => setPageError(error.message),
  });

  const renameSessionMutation = useMutation<
    { session: SessionSummary; sessionId: string },
    Error,
    { sessionId: string; title: string }
  >({
    mutationKey: ["sessions", "rename"],
    mutationFn: async ({ sessionId, title }) => ({
      sessionId,
      session: await apiRequest<SessionSummary>(
        `/session/${encodeURIComponent(sessionId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ title }),
        },
      ),
    }),
    onSuccess: ({ session, sessionId }) => {
      const applyRename = (chat: Chat) =>
        chat.id === sessionId
          ? {
              ...chat,
              title: session.title,
              updatedAt: session.updatedAt,
              group: groupSession(session.updatedAt),
            }
          : chat;
      queryClient.setQueryData<Chat[]>(sessionQueryKeys.all, (current = []) =>
        sortSessions(current.map(applyRename)),
      );
      queryClient.setQueryData<Chat>(
        sessionQueryKeys.detail(sessionId),
        (current) => (current ? applyRename(current) : current),
      );
      toast.success("Chat renamed");
    },
    onError: (error) => setPageError(error.message),
  });

  const deleteSessionMutation = useMutation<
    string,
    Error,
    { sessionId: string }
  >({
    mutationKey: ["sessions", "delete"],
    mutationFn: async ({ sessionId }) => {
      await apiRequest<{ id: string }>(
        `/session/${encodeURIComponent(sessionId)}`,
        { method: "DELETE" },
      );
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.setQueryData<Chat[]>(sessionQueryKeys.all, (current = []) =>
        current.filter((chat) => chat.id !== sessionId),
      );
      queryClient.removeQueries({
        queryKey: sessionQueryKeys.detail(sessionId),
      });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      if (activeChatId === sessionId) navigate("/session");
      toast.success("Chat deleted");
    },
    onError: (error) => setPageError(error.message),
  });

  const sendMessageMutation = useMutation<
    StreamDoneEvent,
    Error,
    SendMessageVariables
  >({
    mutationKey: ["sessions", "send-message"],
    retry: 0,
    mutationFn: async ({
      attachments,
      content,
      models,
      sessionId,
      temporaryAssistantIds,
      temporaryUserId,
    }) => {
      let completedPayload: StreamDoneEvent | null = null;
      const pendingAssistantIds = Object.values(temporaryAssistantIds);
      const fallbackAssistantId = pendingAssistantIds[0];
      const getPendingAssistantId = (modelId?: string) =>
        (modelId ? temporaryAssistantIds[modelId] : undefined) ??
        fallbackAssistantId;
      const pendingTokens = new Map<string, string>();
      let tokenFlushTimer: number | null = null;
      const flushPendingTokens = () => {
        if (tokenFlushTimer !== null) {
          window.clearTimeout(tokenFlushTimer);
          tokenFlushTimer = null;
        }
        if (!pendingTokens.size) return;

        const tokenUpdates = new Map(pendingTokens);
        pendingTokens.clear();
        updateSessionMessages(sessionId, (messages) =>
          messages.map((message) => {
            const tokenChunk = tokenUpdates.get(message.id);
            return tokenChunk
              ? { ...message, content: message.content + tokenChunk }
              : message;
          }),
        );
      };
      const queueToken = (messageId: string, token: string) => {
        pendingTokens.set(
          messageId,
          `${pendingTokens.get(messageId) ?? ""}${token}`,
        );
        if (tokenFlushTimer === null) {
          tokenFlushTimer = window.setTimeout(
            flushPendingTokens,
            STREAM_TOKEN_FLUSH_MS,
          );
        }
      };
      const response = await fetch(
        `${API_BASE_URL}/session/${encodeURIComponent(sessionId)}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attachments: attachments.map(({ content, name, type }) => ({
              content,
              name,
              type,
            })),
            content,
            ...(models.length > 1
              ? { models }
              : { model: models[0] }),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await readResponseError(response));
      }

      try {
        await consumeEventStream(response, (event, data) => {
          if (event === "model_fallback") {
            const payload = data as ModelFallbackEvent;
            setSelectedModel((current) => {
              if (current !== payload.requestedModel) return current;
              window.localStorage.setItem("wisp-selected-model", payload.model);
              return payload.model;
            });
            toast(payload.message, {
              icon: "↪",
              id: `model-fallback-${sessionId}`,
            });
          }

          if (event === "message") {
            const payload = data as StreamMessageEvent;
            const savedUserMessage = normalizeMessage(payload.userMessage);
            updateSessionMessages(sessionId, (messages) =>
              messages.map((message) =>
                message.id === temporaryUserId ? savedUserMessage : message,
              ),
            );
          }

          if (event === "token") {
            const token = getEventString(data, "token") ?? "";
            const pendingId = getPendingAssistantId(
              getEventString(data, "model"),
            );
            if (pendingId && token) queueToken(pendingId, token);
          }

          if (event === "branch_complete") {
            flushPendingTokens();
            const pendingId = getPendingAssistantId(
              getEventString(data, "model"),
            );
            setStreamingMessageIds((current) =>
              current.filter((id) => id !== pendingId),
            );
          }

          if (event === "branch_error") {
            flushPendingTokens();
            const pendingId = getPendingAssistantId(
              getEventString(data, "model"),
            );
            const failureMessage =
              getEventString(data, "message") ||
              "This model failed to respond.";
            updateSessionMessages(sessionId, (messages) =>
              messages.map((message) =>
                message.id === pendingId
                  ? {
                      ...message,
                      content: `I couldn't complete this response. ${failureMessage}`,
                    }
                  : message,
              ),
            );
            setStreamingMessageIds((current) =>
              current.filter((id) => id !== pendingId),
            );
          }

          if (event === "done") {
            flushPendingTokens();
            const payload = data as StreamDoneEvent;
            const assistantMessages = (
              payload.messages ?? (payload.message ? [payload.message] : [])
            ).map(normalizeMessage);
            if (!assistantMessages.length) {
              throw new Error("The server completed without model responses");
            }
            const pendingIds = new Set(pendingAssistantIds);
            completedPayload = payload;
            queryClient.setQueryData<Chat>(
              sessionQueryKeys.detail(sessionId),
              (chat) =>
                chat
                  ? (() => {
                      let responseIndex = 0;
                      return {
                        ...chat,
                        activeGeneration: null,
                        title: payload.session.title,
                        updatedAt: payload.session.updatedAt,
                        group: groupSession(payload.session.updatedAt),
                        messages: chat.messages.map((message) =>
                          pendingIds.has(message.id)
                            ? (assistantMessages[responseIndex++] ?? message)
                            : message,
                        ),
                      };
                    })()
                  : chat,
            );
            queryClient.setQueryData<Chat[]>(
              sessionQueryKeys.all,
              (current = []) =>
                sortSessions(
                  current.map((chat) =>
                    chat.id === sessionId
                      ? {
                          ...chat,
                          title: payload.session.title,
                          updatedAt: payload.session.updatedAt,
                          group: groupSession(payload.session.updatedAt),
                        }
                      : chat,
                  ),
                ),
            );
          }

          if (event === "error") {
            flushPendingTokens();
            throw new Error(
              getEventString(data, "message") || "The message stream failed",
            );
          }
        });
      } finally {
        flushPendingTokens();
      }

      if (!completedPayload) {
        throw new Error("The message stream ended before completion");
      }
      return completedPayload;
    },
    onMutate: ({
      displayContent,
      sessionId,
      temporaryAssistantIds,
      temporaryUserId,
    }) => {
      setPageError(null);
      shouldFollowStreamRef.current = true;
      setStreamingMessageIds(Object.values(temporaryAssistantIds));
      updateSessionMessages(sessionId, (messages) => [
        ...messages,
        {
          id: temporaryUserId,
          role: "user",
          content: displayContent,
          createdAt: new Date().toISOString(),
        },
        ...Object.entries(temporaryAssistantIds).map(([model, id]) => ({
          id,
          role: "assistant" as const,
          content: "",
          model,
        })),
      ]);
    },
    onError: (
      error,
      { sessionId, temporaryAssistantIds, temporaryUserId },
    ) => {
      setPageError(error.message);
      const pendingIds = new Set(Object.values(temporaryAssistantIds));
      updateSessionMessages(sessionId, (messages) =>
        messages.filter(
          (message) =>
            !pendingIds.has(message.id) &&
            message.id !== temporaryUserId,
        ),
      );
    },
    onSettled: (_data, _error, { sessionId }) => {
      setStreamingMessageIds([]);
      void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.detail(sessionId),
      });
    },
  });

  const loadingChats = sessionsQuery.isLoading;
  const loadingProjects = projectsQuery.isLoading;
  const loadingActiveChat = activeSessionQuery.isLoading;
  const creatingProject = createProjectMutation.isPending;
  const creatingSession = createSessionMutation.isPending;
  const branchingStreamActive =
    (sendMessageMutation.isPending &&
      (sendMessageMutation.variables?.models.length ?? 0) > 1) ||
    activeChat?.activeGeneration?.mode === "branching";
  const busyProjectId = renameProjectMutation.isPending
    ? (renameProjectMutation.variables?.project.id ?? null)
    : deleteProjectMutation.isPending
      ? (deleteProjectMutation.variables?.project.id ?? null)
      : null;
  const busySessionId = renameSessionMutation.isPending
    ? (renameSessionMutation.variables?.sessionId ?? null)
    : deleteSessionMutation.isPending
      ? (deleteSessionMutation.variables?.sessionId ?? null)
      : null;
  const awaitingPersistedAssistant = isAwaitingPersistedAssistant(activeChat);
  const recoveryMessages = useMemo<Message[]>(() => {
    const generation = activeChat?.activeGeneration;
    if (generation) {
      return generation.branches.map((branch) => ({
        id: getRecoveryMessageId(generation.id, branch.model),
        role: "assistant",
        content: branch.content,
        model: branch.model,
      }));
    }
    return awaitingPersistedAssistant
      ? [
          {
            id: RECOVERING_ASSISTANT_ID,
            role: "assistant",
            content: "",
          },
        ]
      : [];
  }, [activeChat?.activeGeneration, awaitingPersistedAssistant]);
  const visibleMessages = useMemo(
    () =>
      activeChat
        ? awaitingPersistedAssistant
          ? [...activeChat.messages, ...recoveryMessages]
          : activeChat.messages
        : [],
    [activeChat, awaitingPersistedAssistant, recoveryMessages],
  );
  const activeStreamingMessageIds = useMemo(
    () =>
      streamingMessageIds.length
        ? streamingMessageIds
        : activeChat?.activeGeneration
          ? activeChat.activeGeneration.branches
              .filter((branch) => branch.status === "streaming")
              .map((branch) =>
                getRecoveryMessageId(
                  activeChat.activeGeneration!.id,
                  branch.model,
                ),
              )
          : awaitingPersistedAssistant
            ? [RECOVERING_ASSISTANT_ID]
            : [],
    [activeChat?.activeGeneration, awaitingPersistedAssistant, streamingMessageIds],
  );
  const latestStreamingContent = useMemo(
    () =>
      visibleMessages
        .filter((message) => activeStreamingMessageIds.includes(message.id))
        .map((message) => message.content)
        .join("\n"),
    [activeStreamingMessageIds, visibleMessages],
  );
  const activeStreamingMessageKey = activeStreamingMessageIds.join("|");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("wisp-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (landingDraftConsumedRef.current) return;
    landingDraftConsumedRef.current = true;
    window.localStorage.removeItem(LANDING_DRAFT_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!pageError) return;
    toast.error(pageError, { id: "chat-page-error" });
    setPageError(null);
  }, [pageError]);

  useEffect(() => {
    const error =
      activeSessionQuery.error ??
      modelsQuery.error ??
      projectsQuery.error ??
      sessionsQuery.error;
    if (error) setPageError(error.message);
  }, [
    activeSessionQuery.error,
    modelsQuery.error,
    projectsQuery.error,
    sessionsQuery.error,
  ]);

  useEffect(() => {
    if (!projectsQuery.isSuccess || !selectedProjectId) return;
    if (projectsQuery.data.some((project) => project.id === selectedProjectId))
      return;

    setSelectedProjectId(null);
    window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
  }, [projectsQuery.data, projectsQuery.isSuccess, selectedProjectId]);

  useEffect(() => {
    const catalog = modelsQuery.data;
    if (!catalog) return;

    const nextModel = catalog.models.some(
      (model) => model.id === selectedModel,
    )
      ? selectedModel
      : catalog.fallbackModel;

    if (nextModel !== selectedModel) setSelectedModel(nextModel);
    window.localStorage.setItem("wisp-selected-model", nextModel);
  }, [modelsQuery.data, selectedModel]);

  useEffect(() => {
    const generation = activeChat?.activeGeneration;
    if (!generation || hydratedGenerationRef.current === generation.id) return;
    hydratedGenerationRef.current = generation.id;

    setChatMode(generation.mode);
    window.localStorage.setItem(BRANCH_MODE_STORAGE_KEY, generation.mode);
    if (generation.mode === "branching") {
      setSelectedBranchModels(generation.models);
      window.localStorage.setItem(
        BRANCH_MODELS_STORAGE_KEY,
        JSON.stringify(generation.models),
      );
    } else if (generation.models[0]) {
      setSelectedModel(generation.models[0]);
      window.localStorage.setItem("wisp-selected-model", generation.models[0]);
    }
  }, [activeChat?.activeGeneration]);

  useEffect(() => {
    const catalog = modelsQuery.data;
    if (!catalog) return;

    const availableModels = new Set(catalog.models.map((model) => model.id));
    const nextModels = selectedBranchModels
      .filter((model, index, all) =>
        availableModels.has(model) && all.indexOf(model) === index,
      )
      .slice(0, MAX_BRANCH_MODELS);
    const preferredModels = [
      selectedModel,
      catalog.fallbackModel,
      ...catalog.models.map((model) => model.id),
    ];
    for (const model of preferredModels) {
      if (
        nextModels.length >= MIN_BRANCH_MODELS ||
        !availableModels.has(model) ||
        nextModels.includes(model)
      )
        continue;
      nextModels.push(model);
    }

    if (
      nextModels.length !== selectedBranchModels.length ||
      nextModels.some((model, index) => model !== selectedBranchModels[index])
    ) {
      setSelectedBranchModels(nextModels);
    }
    window.localStorage.setItem(
      BRANCH_MODELS_STORAGE_KEY,
      JSON.stringify(nextModels),
    );
  }, [modelsQuery.data, selectedBranchModels, selectedModel]);

  useEffect(() => {
    const chat = activeSessionQuery.data;
    if (!chat) return;
    queryClient.setQueryData<Chat[]>(sessionQueryKeys.all, (current = []) =>
      sortSessions([
        chat,
        ...current.filter((item) => item.id !== chat.id),
      ]),
    );
  }, [activeSessionQuery.data, queryClient]);

  useEffect(() => {
    if (!activeChatId || loadingActiveChat) return;

    shouldFollowStreamRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      const scrollContainer = chatScrollRef.current;
      if (scrollContainer)
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeChatId, loadingActiveChat]);

  useEffect(() => {
    if (!activeStreamingMessageIds.length || !shouldFollowStreamRef.current)
      return;

    const frame = window.requestAnimationFrame(() => {
      const scrollContainer = chatScrollRef.current;
      if (scrollContainer)
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeStreamingMessageKey, activeStreamingMessageIds.length]);

  useEffect(() => {
    if (
      branchingStreamActive ||
      !activeStreamingMessageIds.length ||
      !shouldFollowStreamRef.current
    )
      return;

    const frame = window.requestAnimationFrame(() => {
      const scrollContainer = chatScrollRef.current;
      if (scrollContainer)
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    activeStreamingMessageIds.length,
    branchingStreamActive,
    latestStreamingContent,
  ]);

  const createProject = async (name: string) => {
    if (createProjectMutation.isPending) return false;
    setPageError(null);
    try {
      await createProjectMutation.mutateAsync(name);
      return true;
    } catch {
      return false;
    }
  };

  const renameProject = async (project: Project, name: string) => {
    if (renameProjectMutation.isPending) return false;
    setPageError(null);
    try {
      await renameProjectMutation.mutateAsync({ project, name });
      return true;
    } catch {
      return false;
    }
  };

  const deleteProject = async (project: Project) => {
    if (deleteProjectMutation.isPending) return false;
    setPageError(null);
    try {
      await deleteProjectMutation.mutateAsync({ project });
      return true;
    } catch {
      return false;
    }
  };

  const createSession = async () => {
    if (createSessionMutation.isPending) return null;
    setPageError(null);
    try {
      const chat = await createSessionMutation.mutateAsync(selectedProjectId);
      navigate(`/session/${chat.id}`);
      setMobileSidebarOpen(false);
      return chat;
    } catch {
      return null;
    }
  };

  const startNewChat = async () => {
    if (
      activeChat &&
      activeChat.title === "New chat" &&
      activeChat.messages.length === 0 &&
      activeChat.projectId === selectedProjectId
    ) {
      setMobileSidebarOpen(false);
      return;
    }

    setComposerValue("");
    setAttachments([]);
    await createSession();
  };

  const openChat = (id: string) => {
    navigate(`/session/${id}`);
    setMobileSidebarOpen(false);
    setPageError(null);
  };

  const selectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, projectId);
    } else {
      window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
    }

    if (
      projectId &&
      activeChat &&
      activeChat.projectId !== projectId
    ) {
      navigate("/session");
      setComposerValue("");
      setAttachments([]);
    }
    setMobileSidebarOpen(false);
    setPageError(null);
  };

  const selectModel = (model: string) => {
    setSelectedModel(model);
    window.localStorage.setItem("wisp-selected-model", model);
  };

  const selectChatMode = (mode: ChatMode) => {
    setChatMode(mode);
    window.localStorage.setItem(BRANCH_MODE_STORAGE_KEY, mode);
  };

  const selectBranchModels = (models: string[]) => {
    const nextModels = [...new Set(models)].slice(0, MAX_BRANCH_MODELS);
    setSelectedBranchModels(nextModels);
    window.localStorage.setItem(
      BRANCH_MODELS_STORAGE_KEY,
      JSON.stringify(nextModels),
    );
  };

  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    setPageError(null);

    const availableSlots = MAX_ATTACHMENT_COUNT - attachments.length;
    if (availableSlots <= 0) {
      setPageError(`You can attach up to ${MAX_ATTACHMENT_COUNT} files.`);
      return;
    }

    const acceptedFiles = files.slice(0, availableSlots);
    if (acceptedFiles.length < files.length) {
      setPageError(`Only the first ${availableSlots} files were added.`);
    }

    const extracted: PendingAttachment[] = [];
    for (const file of acceptedFiles) {
      if (isSensitiveAttachment(file)) {
        setPageError(
          `${file.name} may contain credentials and cannot be attached.`,
        );
        continue;
      }
      if (!isSupportedTextFile(file)) {
        setPageError(`${file.name} is not a supported text or code file.`);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setPageError(
          `${file.name} is larger than ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
        );
        continue;
      }

      const content = await file.text();
      if (content.includes("\0")) {
        setPageError(`${file.name} appears to be a binary file.`);
        continue;
      }
      extracted.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        type: file.type || "text/plain",
        content,
        size: file.size,
      });
    }

    const totalCharacters = [...attachments, ...extracted].reduce(
      (total, attachment) => total + attachment.content.length,
      0,
    );
    if (totalCharacters > MAX_TOTAL_ATTACHMENT_CHARACTERS) {
      setPageError("The combined file content is too large for one request.");
      return;
    }
    setAttachments((current) => [...current, ...extracted]);
  };

  const renameChat = (chat: Chat) => {
    const requestedTitle = window.prompt("Rename chat", chat.title)?.trim();
    if (!requestedTitle || requestedTitle === chat.title) return;

    setPageError(null);
    renameSessionMutation.mutate({
      sessionId: chat.id,
      title: requestedTitle,
    });
  };

  const deleteChat = (chat: Chat) => {
    const confirmed = window.confirm(`Delete “${chat.title}”?`);
    if (!confirmed) return;

    setPageError(null);
    deleteSessionMutation.mutate({ sessionId: chat.id });
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(false);
      return;
    }

    setSidebarCollapsed((current) => {
      window.localStorage.setItem("wisp-sidebar-collapsed", String(!current));
      return !current;
    });
  };

  const handleChatScroll = () => {
    const scrollContainer = chatScrollRef.current;
    if (!scrollContainer) return;

    const distanceFromBottom =
      scrollContainer.scrollHeight -
      scrollContainer.scrollTop -
      scrollContainer.clientHeight;
    shouldFollowStreamRef.current = distanceFromBottom < 120;
  };

  const sendMessage = async () => {
    const content = composerValue.trim();
    if (
      (!content && !attachments.length) ||
      sendMessageMutation.isPending ||
      awaitingPersistedAssistant
    )
      return;

    let session = activeChat;
    if (!session) session = await createSession();
    if (!session) return;

    const sessionId = session.id;
    const requestId = Date.now();
    const temporaryUserId = `pending-user-${requestId}`;
    const requestModels =
      chatMode === "branching"
        ? selectedBranchModels
        : [selectedModel || modelsQuery.data?.fallbackModel || ""];
    if (
      requestModels.some((model) => !model) ||
      (chatMode === "branching" &&
        requestModels.length < MIN_BRANCH_MODELS)
    ) {
      setPageError("Choose at least two models before starting branches.");
      return;
    }
    const temporaryAssistantIds = Object.fromEntries(
      requestModels.map((model, index) => [
        model,
        `pending-assistant-${requestId}-${index}`,
      ]),
    );
    const displayContent =
      content ||
      `Shared ${attachments.length} text ${attachments.length === 1 ? "file" : "files"} for context.`;

    setComposerValue("");
    setAttachments([]);
    sendMessageMutation.mutate({
      attachments,
      content,
      displayContent,
      models: requestModels,
      sessionId,
      temporaryAssistantIds,
      temporaryUserId,
    });
  };

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-white font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <Sidebar
        activeChatId={activeChatId ?? null}
        busyProjectId={busyProjectId}
        busySessionId={busySessionId}
        chats={visibleChats}
        collapsed={sidebarCollapsed}
        creatingProject={creatingProject}
        creatingSession={creatingSession}
        loadingChats={loadingChats}
        loadingProjects={loadingProjects}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onCreateProject={createProject}
        onDeleteProject={deleteProject}
        onDeleteChat={(chat) => void deleteChat(chat)}
        onNewChat={() => void startNewChat()}
        onRenameProject={renameProject}
        onRenameChat={(chat) => void renameChat(chat)}
        onSelectChat={openChat}
        onSelectProject={selectProject}
        onToggle={toggleSidebar}
        onToggleTheme={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
        projects={projectsQuery.data ?? []}
        selectedProjectId={selectedProjectId}
        theme={theme}
      />

      <main className="relative flex min-w-0 flex-1 flex-col bg-white dark:bg-black">
        <header className="flex h-14 shrink-0 items-center justify-between px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-1">
            <IconButton
              className="lg:hidden"
              label="Open sidebar"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="size-5" />
            </IconButton>
            <span className="hidden max-w-48 truncate px-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:block">
              {activeChat?.title || "Wisp"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {activeStreamingMessageIds.length > 0 && (
              <span className="mr-1 hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 sm:flex">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                Safe to leave — generation continues
              </span>
            )}
            {activeChat && (
              <IconButton label="Share chat">
                <Share2 className="size-[18px]" />
              </IconButton>
            )}
            <IconButton label="Chat options">
              <Ellipsis className="size-5" />
            </IconButton>
          </div>
        </header>

        {loadingActiveChat && !activeChat ? (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            Loading chat…
          </div>
        ) : visibleMessages.length ? (
          <div
            className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto"
            onScroll={handleChatScroll}
            onWheel={(event) => {
              if (event.deltaY < 0) shouldFollowStreamRef.current = false;
            }}
            ref={chatScrollRef}
          >
            <ConversationMessages
              messages={visibleMessages}
              models={modelsQuery.data?.models ?? []}
              streamingMessageIds={activeStreamingMessageIds}
              theme={theme}
            />
          </div>
        ) : (
          <EmptyState onPrompt={setComposerValue} />
        )}

        <div className="absolute inset-x-0 bottom-0 bg-white/95 pb-1 pt-2 dark:bg-black/95">
          <Composer
            attachments={attachments}
            branchModels={selectedBranchModels}
            chatMode={chatMode}
            fallbackModel={modelsQuery.data?.fallbackModel ?? ""}
            modelLoading={modelsQuery.isLoading}
            models={modelsQuery.data?.models ?? []}
            onAddFiles={(files) => void addFiles(files)}
            onBranchModelsChange={selectBranchModels}
            onChange={setComposerValue}
            onModeChange={selectChatMode}
            onModelChange={selectModel}
            onRemoveAttachment={(id) =>
              setAttachments((current) =>
                current.filter((attachment) => attachment.id !== id),
              )
            }
            onSubmit={() => void sendMessage()}
            provider={modelsQuery.data?.provider ?? "Models"}
            selectedModel={selectedModel}
            sending={
              sendMessageMutation.isPending ||
              creatingSession ||
              awaitingPersistedAssistant
            }
            value={composerValue}
          />
        </div>
      </main>
    </div>
  );
};

export default ChatPage;
