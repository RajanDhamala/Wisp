import {
  BarChart3,
  Bell,
  Brain,
  ArrowUpRight,
  Moon,
  Palette,
  Shield,
  Sun,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import useUserStore, {
  CURRENT_USER_QUERY_KEY,
  type CurrentUser,
} from "@/UserStore";
import {
  apiRequest,
  fetchMemoryPage,
  fetchUsageSummary,
  memoryQueryKeys,
  usageQueryKeys,
} from "../chatApi";
import type { MemoryPages } from "../chatTypes";
import { getSafeAvatarUrl, getUserInitials } from "../chatUtils";
import { useChatClientStore } from "../state/chatClientStore";
import { IconButton } from "./ChatPrimitives";

const UsageDetailsDialog = lazy(() => import("./UsageDetailsDialog"));

type SettingsSectionId =
  | "general"
  | "account"
  | "memory"
  | "notifications"
  | "usage"
  | "data-controls";

const SETTINGS_SECTIONS: ReadonlyArray<{
  id: SettingsSectionId;
  icon: LucideIcon;
  label: string;
}> = [
  { id: "general", icon: Palette, label: "General" },
  { id: "account", icon: UserRound, label: "Account" },
  { id: "memory", icon: Brain, label: "Memory" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "usage", icon: BarChart3, label: "Usage" },
  { id: "data-controls", icon: Shield, label: "Data controls" },
];

const SECTION_DESCRIPTIONS: Record<SettingsSectionId, string> = {
  account: "Your Wisp profile and sign-in details",
  "data-controls": "Manage and export your Wisp data",
  general: "Appearance and application preferences",
  memory: "Control what Wisp remembers",
  notifications: "Choose how Wisp keeps you updated",
  usage: "Review model and message usage",
};

const formatMemoryDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );

const formatMemoryKind = (kind: string) =>
  `${kind.charAt(0)}${kind.slice(1).toLowerCase()}`;

const formatUsageNumber = (value: number) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: value >= 10_000 ? "compact" : "standard",
  }).format(value);

const formatTokenCredit = (value: string | null) =>
  value === null ? "—" : formatUsageNumber(Number(value));

export const MemorySettingsDialog = ({ onClose }: { onClose: () => void }) => {
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");
  const [usageDetailsOpen, setUsageDetailsOpen] = useState(false);
  const queryClient = useQueryClient();
  const currentUser = useUserStore((state) => state.currentUser);
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const avatarUrl = getSafeAvatarUrl(currentUser?.avatar);
  const theme = useChatClientStore((state) => state.theme);
  const setTheme = useChatClientStore((state) => state.setTheme);
  const memoriesQuery = useInfiniteQuery({
    enabled: activeSection === "memory",
    queryKey: memoryQueryKeys.list,
    queryFn: ({ pageParam, signal }) =>
      fetchMemoryPage({ cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const memories = useMemo(
    () => memoriesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [memoriesQuery.data],
  );
  const usageQuery = useQuery({
    enabled: activeSection === "usage",
    queryKey: usageQueryKeys.summary(),
    queryFn: ({ signal }) => fetchUsageSummary({ signal }),
    refetchInterval: activeSection === "usage" ? 15_000 : false,
  });
  const recentUsageDays = usageQuery.data?.daily.slice(-14) ?? [];
  const maximumDailyTokens = Math.max(
    1,
    ...recentUsageDays.map((day) => day.totalTokens),
  );
  const maximumModelTokens = Math.max(
    1,
    ...(usageQuery.data?.models.map((model) => model.totalTokens) ?? []),
  );
  const quotaLimit = Number(usageQuery.data?.quota.tokenLimit ?? 0);
  const quotaRemaining = Number(
    usageQuery.data?.quota.remainingTokens ?? 0,
  );
  const quotaRemainingPercent = quotaLimit
    ? Math.max(0, Math.min(100, (quotaRemaining / quotaLimit) * 100))
    : 0;
  const updateSettingsMutation = useMutation<CurrentUser, Error, boolean>({
    mutationKey: ["memories", "update-settings"],
    mutationFn: (enabled) =>
      apiRequest<CurrentUser>("/user/memory-settings", {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
      setCurrentUser(user);
      toast.success(
        user.memoryAutoEnabled
          ? "Automatic memory enabled"
          : "Automatic memory disabled",
      );
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMemoryMutation = useMutation<string, Error, string>({
    mutationKey: ["memories", "delete"],
    mutationFn: async (memoryId) => {
      await apiRequest<{ id: string }>(
        `/user/memories/${encodeURIComponent(memoryId)}`,
        { method: "DELETE" },
      );
      return memoryId;
    },
    onSuccess: (memoryId) => {
      queryClient.setQueryData<MemoryPages>(memoryQueryKeys.list, (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: page.items.filter((memory) => memory.id !== memoryId),
              })),
            }
          : current,
      );
      toast.success("Memory deleted");
    },
    onError: (error) => toast.error(error.message),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: memoryQueryKeys.lists }),
  });

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !usageDetailsOpen) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, usageDetailsOpen]);

  const activeSettingsSection =
    SETTINGS_SECTIONS.find((section) => section.id === activeSection) ??
    SETTINGS_SECTIONS[0];

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-6">
      <button
        aria-label="Close settings"
        className="absolute inset-0 bg-zinc-950/35 backdrop-blur-[2px] dark:bg-black/70"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="settings-title"
        aria-modal="true"
        className="relative z-10 flex h-[calc(100dvh-1rem)] w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.22)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:h-[min(680px,calc(100dvh-3rem))] sm:rounded-[20px]"
        role="dialog"
      >
        <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/35 md:flex">
          <button
            aria-label="Close settings"
            className="mb-3 inline-flex size-10 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
          <nav aria-label="Settings sections">
            <div className="space-y-1">
              {SETTINGS_SECTIONS.map((section) => {
                const SectionIcon = section.icon;
                const selected = section.id === activeSection;
                return (
                  <button
                    aria-current={selected ? "page" : undefined}
                    className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors ${
                      selected
                        ? "bg-zinc-200 font-medium text-zinc-950 dark:bg-zinc-700 dark:text-white"
                        : "text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    }`}
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    type="button"
                  >
                    <SectionIcon className="size-[18px] shrink-0" />
                    <span className="truncate">{section.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-700 sm:px-6">
            <div>
              <h2
                className="text-base font-semibold sm:text-lg"
                id="settings-title"
              >
                {activeSettingsSection.label}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 md:hidden">
                {SECTION_DESCRIPTIONS[activeSection]}
              </p>
            </div>
            <button
              aria-label="Close settings"
              className="inline-flex size-10 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white md:hidden"
              onClick={onClose}
              type="button"
            >
              <X className="size-5" />
            </button>
          </header>

          <nav
            aria-label="Settings sections"
            className="subtle-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-200 px-3 py-2 dark:border-zinc-700 md:hidden"
          >
            {SETTINGS_SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              const selected = section.id === activeSection;
              return (
                <button
                  aria-current={selected ? "page" : undefined}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs transition-colors ${
                    selected
                      ? "bg-zinc-200 font-medium text-zinc-950 dark:bg-zinc-700 dark:text-white"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                >
                  <SectionIcon className="size-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>

          <div className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6">
            {activeSection === "general" && (
              <section className="py-5 sm:py-6">
                <div className="border-b border-zinc-200 pb-5 dark:border-zinc-700">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Appearance
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    Choose how Wisp looks on this device.
                  </p>
                  <div className="mt-4 grid max-w-sm grid-cols-2 gap-2">
                    {(
                      [
                        { id: "light", icon: Sun, label: "Light" },
                        { id: "dark", icon: Moon, label: "Dark" },
                      ] as const
                    ).map((option) => {
                      const ThemeIcon = option.icon;
                      const selected = theme === option.id;
                      return (
                        <button
                          aria-pressed={selected}
                          className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors ${
                            selected
                              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                              : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          }`}
                          key={option.id}
                          onClick={() => setTheme(option.id)}
                          type="button"
                        >
                          <ThemeIcon className="size-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-5 py-5">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Language
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Wisp currently uses your browser language.
                    </p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Automatic
                  </span>
                </div>
              </section>
            )}

            {activeSection === "account" && (
              <section className="py-5 sm:py-6">
                <div className="flex items-center gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-700">
                  {avatarUrl ? (
                    <img
                      alt=""
                      className="size-14 shrink-0 rounded-full object-cover"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      src={avatarUrl}
                    />
                  ) : (
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-base font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">
                      {getUserInitials(currentUser?.fullname)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {currentUser?.fullname || "Wisp user"}
                    </h3>
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                      {currentUser?.email || "No email available"}
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                      Full name
                    </dt>
                    <dd className="break-words text-sm text-zinc-800 dark:text-zinc-200">
                      {currentUser?.fullname || "Not available"}
                    </dd>
                  </div>
                  <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                      Email
                    </dt>
                    <dd className="break-words text-sm text-zinc-800 dark:text-zinc-200">
                      {currentUser?.email || "Not available"}
                    </dd>
                  </div>
                  <div className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                      Sign-in method
                    </dt>
                    <dd className="text-sm capitalize text-zinc-800 dark:text-zinc-200">
                      {currentUser?.provider || "Unknown"}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {activeSection === "memory" && (
              <>
                <section className="flex items-center justify-between gap-5 border-b border-zinc-200 py-5 dark:border-zinc-700 sm:py-6">
                  <div className="min-w-0 max-w-xl">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Automatic memory
                    </h3>
                    <p className="mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400 sm:text-sm sm:leading-6">
                      Allow Wisp to save durable preferences and project context
                      for future chats. Turning this off keeps existing memories
                      until you delete them.
                    </p>
                  </div>
                  <button
                    aria-checked={currentUser?.memoryAutoEnabled ?? false}
                    aria-label="Toggle automatic memory"
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-wait disabled:opacity-60 dark:focus-visible:ring-offset-zinc-900 ${
                      currentUser?.memoryAutoEnabled
                        ? "bg-zinc-900 dark:bg-zinc-100"
                        : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                    disabled={updateSettingsMutation.isPending || !currentUser}
                    onClick={() =>
                      updateSettingsMutation.mutate(
                        !currentUser?.memoryAutoEnabled,
                      )
                    }
                    role="switch"
                    type="button"
                  >
                    <span
                      className={`absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-900 ${
                        currentUser?.memoryAutoEnabled
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </section>

                <section className="py-5 sm:py-6">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Saved memories
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Review and remove details Wisp has remembered.
                      </p>
                    </div>
                    {!memoriesQuery.isLoading && (
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                        {memories.length} loaded
                      </span>
                    )}
                  </div>

                  {memoriesQuery.isLoading ? (
                    <div className="space-y-2">
                      {[0, 1, 2].map((item) => (
                        <div
                          className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                          key={item}
                        />
                      ))}
                    </div>
                  ) : memoriesQuery.error && !memories.length ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
                      {memoriesQuery.error.message}
                    </p>
                  ) : !memories.length ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 px-5 py-10 text-center dark:border-zinc-700">
                      <span className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                        <Brain className="size-5" />
                      </span>
                      <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        No memories saved yet
                      </p>
                      <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Enable automatic memory and continue chatting normally.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memories.map((memory) => (
                        <article
                          className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 dark:border-zinc-700 dark:bg-zinc-800/40 sm:p-4"
                          key={memory.id}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                                {formatMemoryKind(memory.kind)}
                              </span>
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                Updated {formatMemoryDate(memory.updatedAt)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                              {memory.content}
                            </p>
                          </div>
                          <IconButton
                            className="hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-950/40 dark:hover:!text-red-400"
                            disabled={
                              deleteMemoryMutation.isPending &&
                              deleteMemoryMutation.variables === memory.id
                            }
                            label="Delete memory"
                            onClick={() =>
                              deleteMemoryMutation.mutate(memory.id)
                            }
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                        </article>
                      ))}
                      {memoriesQuery.hasNextPage && (
                        <button
                          className="flex h-10 w-full items-center justify-center rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          disabled={memoriesQuery.isFetchingNextPage}
                          onClick={() => void memoriesQuery.fetchNextPage()}
                          type="button"
                        >
                          {memoriesQuery.isFetchingNextPage
                            ? "Loading…"
                            : "Load more"}
                        </button>
                      )}
                    </div>
                  )}
                </section>
              </>
            )}

            {activeSection === "notifications" && (
              <section className="flex min-h-[26rem] flex-col items-center justify-center py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  <Bell className="size-5" />
                </span>
                <h3 className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Notification controls are coming soon
                </h3>
                <p className="mt-1.5 max-w-sm text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  This section will hold product updates and background task
                  notification preferences when those features are available.
                </p>
              </section>
            )}

            {activeSection === "usage" && (
              <section className="py-5 sm:py-6">
                {usageQuery.isLoading ? (
                  <div className="space-y-3">
                    <div className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[0, 1, 2, 3].map((item) => (
                        <div
                          className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                          key={item}
                        />
                      ))}
                    </div>
                    <div className="h-44 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                ) : usageQuery.error ? (
                  <div className="flex min-h-[26rem] flex-col items-center justify-center text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400">
                      <BarChart3 className="size-5" />
                    </span>
                    <h3 className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Usage could not be loaded
                    </h3>
                    <p className="mt-1.5 max-w-sm text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                      {usageQuery.error.message}
                    </p>
                    <button
                      className="mt-4 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      onClick={() => void usageQuery.refetch()}
                      type="button"
                    >
                      Try again
                    </button>
                  </div>
                ) : usageQuery.data ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-800/45 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {usageQuery.data.quota.metered
                              ? "Token credits"
                              : "Included test credit"}
                          </p>
                          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                            {usageQuery.data.quota.metered
                              ? formatTokenCredit(
                                  usageQuery.data.quota.remainingTokens,
                                )
                              : `$${usageQuery.data.plan.defaultIncludedCreditUsd.toFixed(2)}`}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {usageQuery.data.quota.metered
                              ? `${formatTokenCredit(usageQuery.data.quota.tokenLimit)} total credits`
                              : "Usage limits and dollar deductions are not enforced yet"}
                          </p>
                        </div>
                        <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                          {usageQuery.data.quota.source === "redis"
                            ? "Live"
                            : usageQuery.data.quota.metered
                              ? "Database"
                              : "Testing"}
                        </span>
                      </div>
                      {usageQuery.data.quota.metered && (
                        <div className="mt-4">
                          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                            <div
                              className="h-full rounded-full bg-zinc-900 transition-[width] dark:bg-zinc-100"
                              style={{ width: `${quotaRemainingPercent}%` }}
                            />
                          </div>
                          <div className="mt-2 flex justify-between gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span>
                              {formatTokenCredit(
                                usageQuery.data.quota.usedTokens,
                              )}{" "}
                              used
                            </span>
                            <span>{quotaRemainingPercent.toFixed(0)}% left</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        {
                          label: "Requests",
                          value: usageQuery.data.totals.requests,
                        },
                        {
                          label: "Messages",
                          value: usageQuery.data.totals.messages,
                        },
                        {
                          label: "Input tokens",
                          value: usageQuery.data.totals.inputTokens,
                        },
                        {
                          label: "Output tokens",
                          value: usageQuery.data.totals.outputTokens,
                        },
                      ].map((metric) => (
                        <div
                          className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700"
                          key={metric.label}
                        >
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {metric.label}
                          </p>
                          <p
                            className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
                            title={metric.value.toLocaleString()}
                          >
                            {formatUsageNumber(metric.value)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Daily tokens
                          </h3>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Last 14 days · {formatUsageNumber(
                              usageQuery.data.totals.totalTokens,
                            )}{" "}
                            tokens in 30 days
                          </p>
                        </div>
                        {usageQuery.data.totals.cachedInputTokens > 0 && (
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {formatUsageNumber(
                              usageQuery.data.totals.cachedInputTokens,
                            )}{" "}
                            cached
                          </span>
                        )}
                      </div>
                      <div
                        aria-label="Token usage for the last 14 days"
                        className="mt-5 flex h-28 items-end gap-1.5"
                        role="img"
                      >
                        {recentUsageDays.map((day) => (
                          <div
                            className="flex h-full min-w-0 flex-1 items-end"
                            key={day.date}
                            title={`${new Date(`${day.date}T00:00:00Z`).toLocaleDateString()}: ${day.totalTokens.toLocaleString()} tokens`}
                          >
                            <span
                              className={`w-full rounded-sm ${
                                day.totalTokens
                                  ? "bg-zinc-700 dark:bg-zinc-300"
                                  : "bg-zinc-100 dark:bg-zinc-800"
                              }`}
                              style={{
                                height: day.totalTokens
                                  ? `${Math.max(5, (day.totalTokens / maximumDailyTokens) * 100)}%`
                                  : "3px",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                        <span>
                          {recentUsageDays[0]
                            ? new Date(
                                `${recentUsageDays[0].date}T00:00:00Z`,
                              ).toLocaleDateString(undefined, {
                                day: "numeric",
                                month: "short",
                              })
                            : ""}
                        </span>
                        <span>Today</span>
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-end justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Models
                          </h3>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Token usage by actual provider model
                          </p>
                        </div>
                      </div>
                      {usageQuery.data.models.length ? (
                        <div className="space-y-2">
                          {usageQuery.data.models.slice(0, 6).map((model) => (
                            <div
                              className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700"
                              key={model.model}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <span className="min-w-0 truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                  {model.model}
                                </span>
                                <span className="shrink-0 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                                  {formatUsageNumber(model.totalTokens)} tokens ·{" "}
                                  {model.requests} req
                                </span>
                              </div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <div
                                  className="h-full rounded-full bg-zinc-600 dark:bg-zinc-400"
                                  style={{
                                    width: `${Math.max(2, (model.totalTokens / maximumModelTokens) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-zinc-200 px-5 py-8 text-center dark:border-zinc-700">
                          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            No model usage in the last 30 days
                          </p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            New completed responses will appear here.
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      className="group flex min-h-12 items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-sm font-medium text-zinc-800 transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800/45 dark:text-zinc-100 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/20"
                      onClick={() => setUsageDetailsOpen(true)}
                      type="button"
                    >
                      <span>
                        View detailed usage
                        <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          Filters, trends, and model breakdowns
                        </span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  </div>
                ) : null}
              </section>
            )}

            {activeSection === "data-controls" && (
              <section className="py-5 sm:py-6">
                <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Export your data
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Download your chats, projects, and saved memories.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      Coming soon
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <h3 className="text-sm font-medium text-red-600 dark:text-red-400">
                        Delete account
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Permanently remove your account and associated data.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      Coming soon
                    </span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
    </div>
    {usageDetailsOpen && (
      <Suspense
        fallback={
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-zinc-950/55 backdrop-blur-[3px] dark:bg-black/80">
            <span className="size-7 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          </div>
        }
      >
        <UsageDetailsDialog onClose={() => setUsageDetailsOpen(false)} />
      </Suspense>
    )}
    </>,
    document.body,
  );
};
