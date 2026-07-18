import {
  ArrowUp,
  ChevronDown,
  FileText,
  GitBranch,
  Globe2,
  Image as ImageIcon,
  Mic,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FAVORITE_MODELS_STORAGE_KEY,
  MAX_ATTACHMENT_COUNT,
  MAX_BRANCH_MODELS,
  MIN_BRANCH_MODELS,
} from "../chatConstants";
import type {
  ChatMode,
  ModelOption,
  PendingAttachment,
} from "../chatTypes";
import { formatFileSize } from "../chatUtils";
import { IconButton, ModelLogo } from "./ChatPrimitives";
import { DeepSeekPeakNotice } from "./DeepSeekPeakNotice";

export const EmptyState = ({ onPrompt }: { onPrompt: (prompt: string) => void }) => {
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
      className={`group flex w-full items-center rounded-lg text-sm ${model.id === selectedModel?.id
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
          className={`size-3.5 ${favoriteModels.has(model.id)
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
                  className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${checked
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
                    className={`flex size-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold ${checked
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

const ComposerComponent = ({
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
      <DeepSeekPeakNotice
        branchModels={branchModels}
        chatMode={chatMode}
        fallbackModel={fallbackModel}
        models={models}
        selectedModel={selectedModel}
      />
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
              className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${chatMode === "branching"
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

export const Composer = memo(ComposerComponent);
