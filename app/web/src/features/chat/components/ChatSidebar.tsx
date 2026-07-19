import {
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Ellipsis,
  Folder,
  Library,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plus,
  Search,
  Settings,
  SquarePen,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useUserStore, { CURRENT_USER_QUERY_KEY } from "@/UserStore";
import {
  apiRequest,
  fetchSessionPage,
  libraryQueryKeys,
  projectQueryKeys,
  sessionQueryKeys,
} from "../chatApi";
import {
  SEARCH_DEBOUNCE_MS,
  SELECTED_PROJECT_STORAGE_KEY,
} from "../chatConstants";
import type {
  Chat,
  Project,
  SavedResponse,
  SessionGroup,
  SessionPage,
} from "../chatTypes";
import { formatResponseTime, useDebouncedValue } from "../chatUtils";
import { IconButton } from "./ChatPrimitives";

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
    className={`flex h-10 w-full items-center rounded-lg text-sm text-zinc-800 transition-colors hover:bg-zinc-200/70 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-800 ${collapsed ? "justify-center px-0" : "gap-3 px-3"
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
  const openMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (openMenuRef.current?.contains(event.target as Node)) return;
      setOpenMenuId(null);
      setConfirmDeleteId(null);
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [openMenuId]);

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
          className={`flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors ${selectedProjectId === null
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
              <div
                className="group relative"
                key={project.id}
                ref={openMenuId === project.id ? openMenuRef : undefined}
              >
                <button
                  className={`flex h-9 w-full items-center gap-2 rounded-lg pl-3 pr-16 text-left text-sm transition-colors ${selectedProjectId === project.id
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
                  className="absolute right-1 top-0.5 flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-300 disabled:opacity-40 dark:hover:bg-zinc-700 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
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
  hasMore,
  loading,
  loadingMore,
  busySessionId,
  onDelete,
  onRename,
  onSelect,
}: {
  chats: Chat[];
  activeChatId: string | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  busySessionId: string | null;
  onDelete: (chat: Chat) => void;
  onRename: (chat: Chat) => void;
  onSelect: (id: string) => void;
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement>(null);
  const groups: SessionGroup[] = [
    "Today",
    "Previous 7 days",
    "Previous 30 days",
    "Older",
  ];

  useEffect(() => {
    if (!openMenuId) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (openMenuRef.current?.contains(event.target as Node)) return;
      setOpenMenuId(null);
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [openMenuId]);

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
                <div
                  className="group relative"
                  key={chat.id}
                  ref={openMenuId === chat.id ? openMenuRef : undefined}
                >
                  <button
                    className={`flex h-9 w-full items-center rounded-lg pl-3 pr-9 text-left text-sm transition-colors ${activeChatId === chat.id
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
                    className="absolute right-1 top-0.5 flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
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
      {(loadingMore || hasMore) && (
        <p className="px-3 pb-2 text-center text-[11px] text-zinc-500">
          {loadingMore ? "Loading older chats…" : "Scroll for older chats"}
        </p>
      )}
    </div>
  );
};

export const ChatActionDialog = ({
  action,
  busy,
  chat,
  onClose,
  onDelete,
  onRename,
}: {
  action: "rename" | "delete";
  busy: boolean;
  chat: Chat;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onRename: (title: string) => Promise<void>;
}) => {
  const [title, setTitle] = useState(chat.title);
  const isRename = action === "rename";
  const nextTitle = title.trim();
  const canRename = Boolean(nextTitle && nextTitle !== chat.title);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose]);

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (isRename) {
      if (!canRename) return;
      await onRename(nextTitle);
      return;
    }
    await onDelete();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6">
      <button
        aria-label={`Cancel ${action} chat`}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        disabled={busy}
        onClick={onClose}
        type="button"
      />
      <section
        aria-describedby="chat-action-description"
        aria-labelledby="chat-action-title"
        aria-modal="true"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              className="text-base font-semibold text-zinc-950 dark:text-zinc-100"
              id="chat-action-title"
            >
              {isRename ? "Rename chat" : "Delete chat?"}
            </h2>
            <p
              className="mt-1 text-sm leading-5 text-zinc-500"
              id="chat-action-description"
            >
              {isRename
                ? "Choose a clear title so this conversation is easy to find later."
                : "This conversation and all of its messages will be permanently deleted."}
            </p>
          </div>
          <IconButton
            disabled={busy}
            label={`Cancel ${action} chat`}
            onClick={onClose}
          >
            <X className="size-4" />
          </IconButton>
        </div>

        <form className="p-5" onSubmit={(event) => void submitAction(event)}>
          {isRename ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Chat title
              </span>
              <input
                autoFocus
                className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                disabled={busy}
                maxLength={100}
                onChange={(event) => setTitle(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                value={title}
              />
            </label>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/70 dark:bg-red-950/30">
              <p className="truncate text-sm font-medium text-red-800 dark:text-red-300">
                {chat.title}
              </p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                This action cannot be undone.
              </p>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              className="h-10 rounded-xl px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              disabled={busy}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`h-10 rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isRename
                ? "bg-zinc-900 hover:bg-zinc-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                : "bg-red-600 hover:bg-red-700"
                }`}
              disabled={busy || (isRename && !canRename)}
              type="submit"
            >
              {busy
                ? isRename
                  ? "Renaming…"
                  : "Deleting…"
                : isRename
                  ? "Rename"
                  : "Delete chat"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export const SearchChatsDialog = ({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (chatId: string) => void;
}) => {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(
    normalizedQuery,
    SEARCH_DEBOUNCE_MS,
  );
  const searchQuery = useQuery<SessionPage, Error>({
    queryKey: sessionQueryKeys.search(debouncedQuery),
    queryFn: ({ signal }) =>
      fetchSessionPage({ search: debouncedQuery, signal }),
    staleTime: 30_000,
  });
  const matchingChats = searchQuery.data?.items ?? [];
  const searchSettling = normalizedQuery !== debouncedQuery;

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center px-3 pt-[10dvh] sm:px-6">
      <button
        aria-label="Close chat search"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label="Search chats"
        aria-modal="true"
        className="relative z-10 flex max-h-[75dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
      >
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Search className="size-5 shrink-0 text-zinc-400" />
          <input
            autoFocus
            className="h-14 min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chat titles"
            value={query}
          />
          {(searchSettling || searchQuery.isFetching) && (
            <span className="text-xs text-zinc-400">Searching…</span>
          )}
          <IconButton label="Close chat search" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="subtle-scrollbar min-h-0 overflow-y-auto p-2">
          {searchQuery.error ? (
            <p className="px-3 py-10 text-center text-sm text-red-600 dark:text-red-400">
              {searchQuery.error.message}
            </p>
          ) : searchQuery.isPending ? (
            <p className="px-3 py-10 text-center text-sm text-zinc-500">
              Loading chats…
            </p>
          ) : !matchingChats.length ? (
            <p className="px-3 py-10 text-center text-sm text-zinc-500">
              {normalizedQuery ? "No matching chats found." : "No chats yet."}
            </p>
          ) : (
            <div className="space-y-1">
              {matchingChats.map((chat) => (
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  key={chat.id}
                  onClick={() => onSelect(chat.id)}
                  type="button"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    <Search className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {chat.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {formatResponseTime(chat.updatedAt, Date.now())}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export const LibraryDialog = ({
  deletingResponseId,
  error,
  loading,
  onClose,
  onDelete,
  responses,
}: {
  deletingResponseId: string | null;
  error?: string;
  loading: boolean;
  onClose: () => void;
  onDelete: (savedResponseId: string) => void;
  responses: SavedResponse[];
}) => {
  const [copiedResponseId, setCopiedResponseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matchingResponses = useMemo(
    () =>
      responses.filter((response) =>
        [response.sourceChatTitle, response.model ?? "", response.content]
          .join("\n")
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery, responses],
  );

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const copySavedResponse = async (response: SavedResponse) => {
    await navigator.clipboard?.writeText(response.content);
    setCopiedResponseId(response.id);
    window.setTimeout(() => setCopiedResponseId(null), 1_400);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
      <button
        aria-label="Close library"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label="Saved response library"
        aria-modal="true"
        className="relative z-10 flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
              Library
            </h2>
            <p className="text-xs text-zinc-500">
              Useful responses you saved for later
            </p>
          </div>
          <IconButton label="Close library" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="border-b border-zinc-200 p-3 dark:border-zinc-800 sm:px-5">
          <label className="flex h-10 items-center gap-2 rounded-xl bg-zinc-100 px-3 dark:bg-zinc-900">
            <Search className="size-4 text-zinc-400" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search saved responses"
              value={query}
            />
          </label>
        </div>
        <div className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div
                  className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900"
                  key={item}
                />
              ))}
            </div>
          ) : error ? (
            <p className="py-12 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : !matchingResponses.length ? (
            <div className="py-14 text-center">
              <Bookmark className="mx-auto size-8 text-zinc-300 dark:text-zinc-700" />
              <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {normalizedQuery
                  ? "No saved responses match your search."
                  : "Your library is empty."}
              </p>
              {!normalizedQuery && (
                <p className="mt-1 text-xs text-zinc-500">
                  Use the response menu to save something useful.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {matchingResponses.map((response) => (
                <article
                  className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  key={response.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {response.sourceChatTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {[response.model, formatResponseTime(response.createdAt, Date.now())]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton
                        label="Copy saved response"
                        onClick={() => void copySavedResponse(response)}
                      >
                        {copiedResponseId === response.id ? (
                          <Check className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </IconButton>
                      <IconButton
                        disabled={deletingResponseId === response.id}
                        label="Remove from library"
                        onClick={() => onDelete(response.id)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </div>
                  <div className="subtle-scrollbar mt-3 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-sm leading-6 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {response.content}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
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
      queryClient.removeQueries({ queryKey: libraryQueryKeys.responses });
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

const SidebarComponent = ({
  chats,
  projects,
  activeChatId,
  selectedProjectId,
  collapsed,
  mobileOpen,
  theme,
  hasMoreChats,
  loadingChats,
  loadingMoreChats,
  loadingProjects,
  creatingProject,
  creatingSession,
  busyProjectId,
  busySessionId,
  onCloseMobile,
  onCreateProject,
  onDeleteProject,
  onDeleteChat,
  onLoadMoreChats,
  onOpenLibrary,
  onNewChat,
  onRenameProject,
  onRenameChat,
  onSelectChat,
  onSelectProject,
  onSearchChats,
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
  hasMoreChats: boolean;
  loadingChats: boolean;
  loadingMoreChats: boolean;
  loadingProjects: boolean;
  creatingProject: boolean;
  creatingSession: boolean;
  busyProjectId: string | null;
  busySessionId: string | null;
  onCloseMobile: () => void;
  onCreateProject: (name: string) => Promise<boolean>;
  onDeleteProject: (project: Project) => Promise<boolean>;
  onDeleteChat: (chat: Chat) => void;
  onLoadMoreChats: () => void;
  onOpenLibrary: () => void;
  onNewChat: () => void;
  onRenameProject: (project: Project, name: string) => Promise<boolean>;
  onRenameChat: (chat: Chat) => void;
  onSelectChat: (id: string) => void;
  onSelectProject: (projectId: string | null) => void;
  onSearchChats: () => void;
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
      className={`fixed inset-y-0 left-0 z-40 flex border-r border-zinc-200 bg-zinc-100 transition-[width,transform] duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:relative lg:translate-x-0 ${collapsed ? "lg:w-[68px]" : "lg:w-[280px]"
        } ${mobileOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full"}`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={`flex h-14 items-center ${collapsed ? "lg:justify-center lg:px-2" : "justify-between px-3"}`}
        >
          <Link
            aria-label="Wisp home"
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-950 outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-white dark:focus-visible:ring-zinc-600 ${collapsed ? "lg:hidden" : ""}`}
            to="/"
          >
            <img
              alt=""
              aria-hidden="true"
              className="size-7 rounded-lg shadow-sm"
              src="/wisp-logo-dark.svg"
            />
            Wisp
          </Link>

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
            onClick={onSearchChats}
          />
          <SidebarItem
            collapsed={collapsed && !mobileOpen}
            icon={<Library className="size-[18px]" />}
            label="Library"
            onClick={onOpenLibrary}
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

        <div
          className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-4"
          onScroll={(event) => {
            const scrollArea = event.currentTarget;
            const distanceFromBottom =
              scrollArea.scrollHeight -
              scrollArea.scrollTop -
              scrollArea.clientHeight;
            if (
              distanceFromBottom < 160 &&
              hasMoreChats &&
              !loadingMoreChats
            ) {
              onLoadMoreChats();
            }
          }}
        >
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
                hasMore={hasMoreChats}
                loading={loadingChats}
                loadingMore={loadingMoreChats}
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

export const Sidebar = memo(SidebarComponent);
