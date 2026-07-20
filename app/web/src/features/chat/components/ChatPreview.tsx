import {
  Check,
  Code2,
  Copy,
  Maximize2,
  Minimize2,
  Play,
  Terminal,
  X,
} from "lucide-react";
import {
  lazy,
  memo,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  APPROVED_PREVIEW_DEPENDENCIES,
  MAX_PREVIEW_PATH_SEGMENT_CHARACTERS,
  MAX_PREVIEW_PATH_SEGMENTS,
} from "../chatConstants";
import {
  getSandpackBundlerUrl,
  SANDPACK_BUNDLER_TIMEOUT_MS,
} from "@/Utils/SandpackConfig";
import { IconButton } from "./ChatPrimitives";

type PreviewTemplate = "react-ts" | "static";

type PreviewRuntimeProps = {
  dependencies: Record<string, string>;
  entry?: string;
  files: Record<string, string>;
  height: number | string;
  template: PreviewTemplate;
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
                <div className="max-w-2xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
                  <p className="font-semibold">Preview failed to start</p>
                  <pre className="subtle-scrollbar mt-2 max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs">
                    {failureMessage}
                  </pre>
                  {timedOut && (
                    <button
                      className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-950/70"
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
            theme="light"
          >
            <RuntimePreview height={height} />
          </SandpackProvider>
        ),
      };
    },
  ),
);

// Chat domain contracts live in the chat feature module.








































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

const namedBlockHeaderPattern =
  /^[a-z0-9_+.-]+\s+(?:file|filename|title)=(?:"[^"]+"|'[^']+'|\S+)\s*$/i;
const proseFenceLanguages = new Set(["", "markdown", "md", "text", "txt"]);

const repairUnfencedNamedBlocks = (content: string) => {
  const repairedLines: string[] = [];
  let openFence: { info: string; lineIndex: number } | null = null;

  for (const line of content.split("\n")) {
    const fence = line.match(/^([ \t]*)```(.*)$/);

    if (fence) {
      const indentation = fence[1];
      const info = fence[2].trim();

      if (!openFence) {
        repairedLines.push(line);
        openFence = { info, lineIndex: repairedLines.length - 1 };
        continue;
      }

      if (!info) {
        repairedLines.push(line);
        openFence = null;
        continue;
      }

      const openLanguage = getFenceDetails(openFence.info).language;
      if (
        namedBlockHeaderPattern.test(info) &&
        proseFenceLanguages.has(openLanguage)
      ) {
        // Some models merge a closing fence and the next named opening fence
        // into one line (```tsx file=/src/App.tsx). Treat the earlier prose as
        // normal Markdown and this line as the real code opening.
        repairedLines[openFence.lineIndex] = "";
        repairedLines.push(`${indentation}\`\`\`${info}`);
        openFence = { info, lineIndex: repairedLines.length - 1 };
        continue;
      }

      repairedLines.push(line);
      continue;
    }

    const bareHeader = line.trim();
    if (namedBlockHeaderPattern.test(bareHeader)) {
      if (!openFence) {
        repairedLines.push(`\`\`\`${bareHeader}`);
        openFence = { info: bareHeader, lineIndex: repairedLines.length - 1 };
        continue;
      }

      const openLanguage = getFenceDetails(openFence.info).language;
      if (proseFenceLanguages.has(openLanguage)) {
        repairedLines[openFence.lineIndex] = "";
        repairedLines.push(`\`\`\`${bareHeader}`);
        openFence = { info: bareHeader, lineIndex: repairedLines.length - 1 };
        continue;
      }
    }

    repairedLines.push(line);
  }

  return repairedLines.join("\n");
};

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
const TAILWIND_DARK_MODE_CONFIGURATION =
  "@custom-variant dark (&:where(.dark, .dark *));";

const TAILWIND_ASYNC_LOADER = [
  'if (!document.querySelector("style[data-wisp-tailwind-theme]")) {',
  '  const tailwindTheme = document.createElement("style");',
  '  tailwindTheme.type = "text/tailwindcss";',
  '  tailwindTheme.dataset.wispTailwindTheme = "true";',
  `  tailwindTheme.textContent = ${JSON.stringify(TAILWIND_DARK_MODE_CONFIGURATION)};`,
  "  document.head.appendChild(tailwindTheme);",
  "}",
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
    `<style data-wisp-tailwind-theme type="text/tailwindcss">${TAILWIND_DARK_MODE_CONFIGURATION}</style>`,
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

const markdownComponents: Components = {
  a: ({ children, href }) => (
    <a
      className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-700 dark:hover:text-blue-300"
      href={href}
      rel="noreferrer noopener"
      target="_blank"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-zinc-300 bg-zinc-50 px-4 py-2 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }) => (
    <code
      className={`${className ?? ""} rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.875em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100`}
      {...props}
    >
      {children}
    </code>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 text-2xl font-bold leading-tight tracking-tight text-zinc-950 first:mt-0 dark:text-white">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-6 text-xl font-bold leading-tight text-zinc-950 first:mt-0 dark:text-white">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-lg font-semibold leading-snug text-zinc-950 first:mt-0 dark:text-white">
      {children}
    </h3>
  ),
  hr: () => <hr className="my-6 border-zinc-200 dark:border-zinc-800" />,
  li: ({ children }) => (
    <li className="pl-1 marker:text-zinc-500 [&>p]:my-0">{children}</li>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>
  ),
  p: ({ children }) => (
    <p className="my-3 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  pre: ({ children }) => (
    <pre className="subtle-scrollbar my-4 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
      {children}
    </pre>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-950 dark:text-white">
      {children}
    </strong>
  ),
  table: ({ children }) => (
    <div className="subtle-scrollbar my-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  td: ({ children }) => (
    <td className="border-b border-r border-zinc-200 px-3 py-2 align-top last:border-r-0 dark:border-zinc-800">
      {children}
    </td>
  ),
  th: ({ children }) => (
    <th className="border-b border-r border-zinc-200 bg-zinc-100 px-3 py-2 font-semibold text-zinc-900 last:border-r-0 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      {children}
    </th>
  ),
  tr: ({ children }) => (
    <tr className="last:[&>td]:border-b-0">{children}</tr>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>
  ),
};

const markdownPlugins = [remarkGfm];

const MarkdownText = ({ content }: { content: string }) => (
  <div className="min-w-0 max-w-full [overflow-wrap:anywhere]">
    <ReactMarkdown
      components={markdownComponents}
      remarkPlugins={markdownPlugins}
    >
      {content}
    </ReactMarkdown>
  </div>
);

const RunnablePreview = ({
  project,
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
      className={`fixed inset-0 z-[100] flex bg-black/60 ${fullScreen ? "p-0" : "items-center justify-center p-3 sm:p-6"
        }`}
      onMouseDown={onClose}
    >
      <section
        className={`overflow-hidden border border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 ${fullScreen
          ? "h-dvh w-screen rounded-none"
          : "w-full max-w-6xl rounded-xl"
          }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-11 items-center justify-between border-b border-zinc-200 px-3 dark:border-zinc-800">
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
            <IconButton
              label="Close preview"
              onClick={onClose}
            >
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
          />
        </Suspense>
      </section>
    </div>
  );
};

const AssistantContentComponent = ({
  content,
  constrainCodeHeight = true,
  streaming,
}: {
  content: string;
  constrainCodeHeight?: boolean;
  streaming: boolean;
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
          <MarkdownText
            content={part.content.trim()}
            key={`text-${index}`}
          />
        );
      })}
      {runnableProject && (
        <RunnablePreview
          onClose={() => setRunningPartIndex(null)}
          project={runnableProject}
        />
      )}
    </>
  );
};

export const AssistantContent = memo(AssistantContentComponent);
