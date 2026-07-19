export const MAX_ATTACHMENT_COUNT = 5;
export const MAX_ATTACHMENT_BYTES = 150_000;
export const MAX_TOTAL_ATTACHMENT_CHARACTERS = 200_000;
export const MAX_EVENT_STREAM_BLOCK_CHARACTERS = 1_000_000;
export const STREAM_TOKEN_FLUSH_MS = 40;
export const MAX_PREVIEW_PATH_SEGMENTS = 12;
export const MAX_PREVIEW_PATH_SEGMENT_CHARACTERS = 80;
export const SESSION_PAGE_SIZE = 15;
export const SEARCH_DEBOUNCE_MS = 350;
export const APPROVED_PREVIEW_DEPENDENCIES: Readonly<Record<string, string>> =
  Object.freeze({
    "@gsap/react": "2.1.2",
    "framer-motion": "12.42.2",
    gsap: "3.15.0",
    "lucide-react": "1.24.0",
    motion: "12.42.2",
  });

export const SENSITIVE_ATTACHMENT_NAMES = [
  /^\.env(?:\.|$)/i,
  /^\.netrc$/i,
  /^\.npmrc$/i,
  /^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)/i,
  /(?:^|[-_.])credentials?(?:[-_.]|$)/i,
  /\.(?:key|p12|pem|pfx)$/i,
];

export const TEXT_FILE_EXTENSIONS = new Set([
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

export const RECOVERING_ASSISTANT_ID = "recovering-assistant";
export const FAVORITE_MODELS_STORAGE_KEY = "wisp-favorite-models";
export const BRANCH_MODE_STORAGE_KEY = "wisp-chat-mode";
export const BRANCH_MODELS_STORAGE_KEY = "wisp-branch-models";
export const SELECTED_PROJECT_STORAGE_KEY = "wisp-selected-project";
export const SELECTED_MODEL_STORAGE_KEY = "wisp-selected-model";
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "wisp-sidebar-collapsed";
export const THEME_STORAGE_KEY = "wisp-theme";
export const MIN_BRANCH_MODELS = 2;
export const MAX_BRANCH_MODELS = 4;

export const getRecoveryMessageId = (generationId: string, model: string) =>
  `${RECOVERING_ASSISTANT_ID}-${generationId}-${model}`;
