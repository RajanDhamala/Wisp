import {
  Ellipsis,
  Menu,
  Share2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { LANDING_DRAFT_STORAGE_KEY } from "@/Utils/LandingDraft";
import {
  apiRequest,
  fetchSessionPage,
  libraryQueryKeys,
  projectQueryKeys,
  sessionQueryKeys,
} from "./chatApi";
import {
  BRANCH_MODELS_STORAGE_KEY,
  BRANCH_MODE_STORAGE_KEY,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_COUNT,
  MAX_BRANCH_MODELS,
  MAX_TOTAL_ATTACHMENT_CHARACTERS,
  MIN_BRANCH_MODELS,
  RECOVERING_ASSISTANT_ID,
  SELECTED_PROJECT_STORAGE_KEY,
  getRecoveryMessageId,
} from "./chatConstants";
import type {
  Chat,
  ChatMode,
  Message,
  ModelCatalog,
  PendingAttachment,
  Project,
  SavedResponse,
  SessionDetails,
  SessionSummary,
} from "./chatTypes";
import {
  formatFileSize,
  groupSession,
  isAwaitingPersistedAssistant,
  isSensitiveAttachment,
  isSupportedTextFile,
  isUnusedNewChat,
  normalizeMessage,
  normalizeSession,
  sortSessions,
} from "./chatUtils";
import { useChatClientStore } from "./state/chatClientStore";
import { IconButton } from "./components/ChatPrimitives";
import { ConversationMessages } from "./components/ChatMessages";
import { Composer, EmptyState } from "./components/ChatComposer";
import {
  LibraryDialog,
  SearchChatsDialog,
  Sidebar,
} from "./components/ChatSidebar";
import { useSessionCache } from "./hooks/useSessionCache";
import { useSendMessageMutation } from "./hooks/useSendMessageMutation";

export const ChatPageContent = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: activeChatId } = useParams<{ id?: string }>();
  const activeDialog = useChatClientStore((state) => state.activeDialog);
  const setActiveDialog = useChatClientStore((state) => state.setActiveDialog);
  const attachments = useChatClientStore((state) => state.attachments);
  const setAttachments = useChatClientStore((state) => state.setAttachments);
  const chatMode = useChatClientStore((state) => state.chatMode);
  const setChatMode = useChatClientStore((state) => state.setChatMode);
  const composerValue = useChatClientStore((state) => state.composerValue);
  const setComposerValue = useChatClientStore(
    (state) => state.setComposerValue,
  );
  const mobileSidebarOpen = useChatClientStore(
    (state) => state.mobileSidebarOpen,
  );
  const setMobileSidebarOpen = useChatClientStore(
    (state) => state.setMobileSidebarOpen,
  );
  const selectedBranchModels = useChatClientStore(
    (state) => state.selectedBranchModels,
  );
  const setSelectedBranchModels = useChatClientStore(
    (state) => state.setSelectedBranchModels,
  );
  const selectedModel = useChatClientStore((state) => state.selectedModel);
  const setSelectedModel = useChatClientStore(
    (state) => state.setSelectedModel,
  );
  const selectedProjectId = useChatClientStore(
    (state) => state.selectedProjectId,
  );
  const setSelectedProjectId = useChatClientStore(
    (state) => state.setSelectedProjectId,
  );
  const sidebarCollapsed = useChatClientStore(
    (state) => state.sidebarCollapsed,
  );
  const setSidebarCollapsed = useChatClientStore(
    (state) => state.setSidebarCollapsed,
  );
  const streamingMessageIds = useChatClientStore(
    (state) => state.streamingMessageIds,
  );
  const setStreamingMessageIds = useChatClientStore(
    (state) => state.setStreamingMessageIds,
  );
  const theme = useChatClientStore((state) => state.theme);
  const setTheme = useChatClientStore((state) => state.setTheme);
  const [pageError, setPageError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const hydratedGenerationRef = useRef<string | null>(null);
  const landingDraftConsumedRef = useRef(false);
  const shouldFollowStreamRef = useRef(true);
  const createSessionRequestRef = useRef<Promise<Chat | null> | null>(null);

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

  const libraryQuery = useQuery<SavedResponse[], Error>({
    queryKey: libraryQueryKeys.responses,
    queryFn: () => apiRequest<SavedResponse[]>("/library/responses"),
    enabled: activeDialog === "library",
  });

  const sessionsQuery = useInfiniteQuery({
    queryKey: sessionQueryKeys.list(selectedProjectId),
    queryFn: ({ pageParam, signal }) =>
      fetchSessionPage({
        cursor: pageParam,
        projectId: selectedProjectId,
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
    refetchOnMount: (query) =>
      query.state.data && isUnusedNewChat(query.state.data) ? false : "always",
    refetchOnReconnect: "always",
    refetchOnWindowFocus: true,
    staleTime: (query) =>
      query.state.data && isUnusedNewChat(query.state.data) ? Infinity : 0,
  });

  const activeChat = activeChatId ? (activeSessionQuery.data ?? null) : null;
  // Only session-list metadata should invalidate the memo; token content must not.
  const activeChatListItem = useMemo<Chat | null>(
    () =>
      activeChat
        ? {
          ...activeChat,
          activeGeneration: null,
          messages: [],
        }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeChat?.createdAt,
      activeChat?.group,
      activeChat?.id,
      activeChat?.messageCount,
      activeChat?.projectId,
      activeChat?.title,
      activeChat?.updatedAt,
    ],
  );
  const chats = useMemo(() => {
    const sessions =
      sessionsQuery.data?.pages.flatMap((page) => page.items) ?? [];
    if (!activeChatListItem) return sessions;
    return sortSessions([
      activeChatListItem,
      ...sessions.filter((chat) => chat.id !== activeChatListItem.id),
    ]);
  }, [activeChatListItem, sessionsQuery.data]);
  const visibleChats = useMemo(
    () =>
      selectedProjectId
        ? chats.filter((chat) => chat.projectId === selectedProjectId)
        : chats,
    [chats, selectedProjectId],
  );

  const {
    invalidateSessionCollections,
    upsertCreatedSession,
    updateSessionLists,
    updateSessionMessages,
  } = useSessionCache();

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
      updateSessionLists((chats) =>
        chats.map((chat) =>
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
      invalidateSessionCollections();
      toast.success("Project deleted. Its chats are still available.");
    },
    onError: (error) => setPageError(error.message),
  });

  const createSessionMutation = useMutation<Chat, Error, string | null>({
    mutationKey: ["sessions", "create"],
    retry: 0,
    mutationFn: async (projectId) => {
      const session = await apiRequest<SessionSummary>("/session", {
        method: "POST",
        body: JSON.stringify({ projectId }),
      });
      return normalizeSession(session, []);
    },
    onSuccess: (chat, projectId) => {
      upsertCreatedSession(chat);
      queryClient.setQueryData<Chat>(
        sessionQueryKeys.detail(chat.id),
        chat,
      );
      if (projectId) {
        queryClient.setQueryData<Project[]>(
          projectQueryKeys.all,
          (current) =>
            current?.map((project) =>
              project.id === projectId
                ? {
                  ...project,
                  sessionCount: project.sessionCount + 1,
                  updatedAt: chat.updatedAt,
                }
                : project,
            ),
        );
      }
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
      updateSessionLists((chats) => sortSessions(chats.map(applyRename)));
      queryClient.setQueryData<Chat>(
        sessionQueryKeys.detail(sessionId),
        (current) => (current ? applyRename(current) : current),
      );
      invalidateSessionCollections();
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
      updateSessionLists((chats) =>
        chats.filter((chat) => chat.id !== sessionId),
      );
      queryClient.removeQueries({
        queryKey: sessionQueryKeys.detail(sessionId),
      });
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.searches,
      });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      if (activeChatId === sessionId) navigate("/session");
      toast.success("Chat deleted");
    },
    onError: (error) => setPageError(error.message),
  });

  const deleteResponseMutation = useMutation<
    { id: string; sessionId: string },
    Error,
    { messageId: string; sessionId: string },
    { previousChat?: Chat }
  >({
    mutationKey: ["sessions", "delete-response"],
    retry: 0,
    mutationFn: async ({ messageId, sessionId }) => ({
      ...(await apiRequest<{ id: string }>(
        `/session/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(messageId)}`,
        { method: "DELETE" },
      )),
      sessionId,
    }),
    onMutate: async ({ messageId, sessionId }) => {
      const queryKey = sessionQueryKeys.detail(sessionId);
      await queryClient.cancelQueries({ queryKey });
      const previousChat = queryClient.getQueryData<Chat>(queryKey);
      updateSessionMessages(sessionId, (messages) =>
        messages.filter((message) => message.id !== messageId),
      );
      return { previousChat };
    },
    onError: (error, { sessionId }, context) => {
      if (context?.previousChat) {
        queryClient.setQueryData(
          sessionQueryKeys.detail(sessionId),
          context.previousChat,
        );
      }
      setPageError(error.message);
    },
    onSuccess: ({ sessionId }) => {
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.detail(sessionId),
      });
    },
  });

  const saveResponseMutation = useMutation<
    SavedResponse,
    Error,
    { messageId: string }
  >({
    mutationKey: ["library", "save-response"],
    retry: 0,
    mutationFn: ({ messageId }) =>
      apiRequest<SavedResponse>("/library/responses", {
        method: "POST",
        body: JSON.stringify({ messageId }),
      }),
    onSuccess: (savedResponse) => {
      queryClient.setQueryData<SavedResponse[]>(
        libraryQueryKeys.responses,
        (current = []) => [
          savedResponse,
          ...current.filter((item) => item.id !== savedResponse.id),
        ],
      );
      toast.success("Saved to library");
    },
    onError: (error) => setPageError(error.message),
  });

  const deleteSavedResponseMutation = useMutation<string, Error, string>({
    mutationKey: ["library", "delete-saved-response"],
    retry: 0,
    mutationFn: async (savedResponseId) => {
      await apiRequest<{ id: string }>(
        `/library/responses/${encodeURIComponent(savedResponseId)}`,
        { method: "DELETE" },
      );
      return savedResponseId;
    },
    onSuccess: (savedResponseId) => {
      queryClient.setQueryData<SavedResponse[]>(
        libraryQueryKeys.responses,
        (current = []) =>
          current.filter((item) => item.id !== savedResponseId),
      );
      toast.success("Removed from library");
    },
    onError: (error) => setPageError(error.message),
  });

  const sendMessageMutation = useSendMessageMutation({
    invalidateSessionCollections,
    setPageError,
    setSelectedModel,
    setStreamingMessageIds,
    shouldFollowStreamRef,
    updateSessionLists,
    updateSessionMessages,
  });

  const loadingChats = sessionsQuery.isLoading;
  const loadingProjects = projectsQuery.isLoading;
  const loadingActiveChat = activeSessionQuery.isLoading;
  const creatingProject = createProjectMutation.isPending;
  const creatingSession = createSessionMutation.isPending;
  const renamingProject = renameProjectMutation.isPending;
  const deletingProject = deleteProjectMutation.isPending;
  const createProjectAsync = createProjectMutation.mutateAsync;
  const renameProjectAsync = renameProjectMutation.mutateAsync;
  const deleteProjectAsync = deleteProjectMutation.mutateAsync;
  const createSessionAsync = createSessionMutation.mutateAsync;
  const renameSession = renameSessionMutation.mutate;
  const deleteSession = deleteSessionMutation.mutate;
  const deleteResponseById = deleteResponseMutation.mutate;
  const saveResponseById = saveResponseMutation.mutate;
  const deleteSavedResponseById = deleteSavedResponseMutation.mutate;
  const sendMessageRequest = sendMessageMutation.mutate;
  const sendingMessage = sendMessageMutation.isPending;
  const fetchNextSessionPage = sessionsQuery.fetchNextPage;
  const hasNextSessionPage = sessionsQuery.hasNextPage;
  const fetchingSessions = sessionsQuery.isFetching;
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
  }, [
    projectsQuery.data,
    projectsQuery.isSuccess,
    selectedProjectId,
    setSelectedProjectId,
  ]);

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
  }, [modelsQuery.data, selectedModel, setSelectedModel]);

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
  }, [
    activeChat?.activeGeneration,
    setChatMode,
    setSelectedBranchModels,
    setSelectedModel,
  ]);

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
  }, [
    modelsQuery.data,
    selectedBranchModels,
    selectedModel,
    setSelectedBranchModels,
  ]);

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

  const createProject = useCallback(async (name: string) => {
    if (creatingProject) return false;
    setPageError(null);
    try {
      await createProjectAsync(name);
      return true;
    } catch {
      return false;
    }
  }, [createProjectAsync, creatingProject]);

  const renameProject = useCallback(async (project: Project, name: string) => {
    if (renamingProject) return false;
    setPageError(null);
    try {
      await renameProjectAsync({ project, name });
      return true;
    } catch {
      return false;
    }
  }, [renameProjectAsync, renamingProject]);

  const deleteProject = useCallback(async (project: Project) => {
    if (deletingProject) return false;
    setPageError(null);
    try {
      await deleteProjectAsync({ project });
      return true;
    } catch {
      return false;
    }
  }, [deleteProjectAsync, deletingProject]);

  const unusedChat = useMemo(
    () =>
      chats.find(
        (chat) =>
          chat.projectId === selectedProjectId && isUnusedNewChat(chat),
      ) ?? null,
    [chats, selectedProjectId],
  );

  const openUnusedChat = useCallback((chat: Chat) => {
    queryClient.setQueryData<Chat>(
      sessionQueryKeys.detail(chat.id),
      (current) => current ?? chat,
    );
    navigate(`/session/${chat.id}`);
    setMobileSidebarOpen(false);
    setPageError(null);
    return chat;
  }, [navigate, queryClient, setMobileSidebarOpen]);

  const createSession = useCallback((): Promise<Chat | null> => {
    if (createSessionRequestRef.current) {
      return createSessionRequestRef.current;
    }
    if (creatingSession) return Promise.resolve(null);

    setPageError(null);
    const request = (async () => {
      try {
        const chat = await createSessionAsync(selectedProjectId);
        navigate(`/session/${chat.id}`);
        setMobileSidebarOpen(false);
        return chat;
      } catch {
        return null;
      }
    })();
    createSessionRequestRef.current = request;
    void request.finally(() => {
      if (createSessionRequestRef.current === request) {
        createSessionRequestRef.current = null;
      }
    });
    return request;
  }, [
    createSessionAsync,
    creatingSession,
    navigate,
    selectedProjectId,
    setMobileSidebarOpen,
  ]);

  const startNewChat = useCallback(async () => {
    if (unusedChat?.id === activeChatId) {
      setMobileSidebarOpen(false);
      return;
    }

    setComposerValue("");
    setAttachments([]);
    if (unusedChat) {
      openUnusedChat(unusedChat);
      return;
    }
    await createSession();
  }, [
    activeChatId,
    createSession,
    openUnusedChat,
    setAttachments,
    setComposerValue,
    setMobileSidebarOpen,
    unusedChat,
  ]);

  const openChat = useCallback((id: string) => {
    navigate(`/session/${id}`);
    setMobileSidebarOpen(false);
    setPageError(null);
  }, [navigate, setMobileSidebarOpen]);

  const selectProject = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, projectId);
    } else {
      window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
    }

    const currentChat = activeChatId
      ? queryClient.getQueryData<Chat>(sessionQueryKeys.detail(activeChatId))
      : null;
    if (projectId && currentChat && currentChat.projectId !== projectId) {
      navigate("/session");
      setComposerValue("");
      setAttachments([]);
    }
    setMobileSidebarOpen(false);
    setPageError(null);
  }, [
    activeChatId,
    navigate,
    queryClient,
    setAttachments,
    setComposerValue,
    setMobileSidebarOpen,
    setSelectedProjectId,
  ]);

  const selectModel = useCallback((model: string) => {
    setSelectedModel(model);
    window.localStorage.setItem("wisp-selected-model", model);
  }, [setSelectedModel]);

  const selectChatMode = useCallback((mode: ChatMode) => {
    setChatMode(mode);
    window.localStorage.setItem(BRANCH_MODE_STORAGE_KEY, mode);
  }, [setChatMode]);

  const selectBranchModels = useCallback((models: string[]) => {
    const nextModels = [...new Set(models)].slice(0, MAX_BRANCH_MODELS);
    setSelectedBranchModels(nextModels);
    window.localStorage.setItem(
      BRANCH_MODELS_STORAGE_KEY,
      JSON.stringify(nextModels),
    );
  }, [setSelectedBranchModels]);

  const addFiles = useCallback(async (files: File[]) => {
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
  }, [attachments, setAttachments]);

  const renameChat = useCallback((chat: Chat) => {
    const requestedTitle = window.prompt("Rename chat", chat.title)?.trim();
    if (!requestedTitle || requestedTitle === chat.title) return;

    setPageError(null);
    renameSession({
      sessionId: chat.id,
      title: requestedTitle,
    });
  }, [renameSession]);

  const deleteChat = useCallback((chat: Chat) => {
    const confirmed = window.confirm(`Delete “${chat.title}”?`);
    if (!confirmed) return;

    setPageError(null);
    deleteSession({ sessionId: chat.id });
  }, [deleteSession]);

  const toggleSidebar = useCallback(() => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(false);
      return;
    }

    setSidebarCollapsed((current) => {
      window.localStorage.setItem("wisp-sidebar-collapsed", String(!current));
      return !current;
    });
  }, [setMobileSidebarOpen, setSidebarCollapsed]);

  const handleChatScroll = useCallback(() => {
    const scrollContainer = chatScrollRef.current;
    if (!scrollContainer) return;

    const distanceFromBottom =
      scrollContainer.scrollHeight -
      scrollContainer.scrollTop -
      scrollContainer.clientHeight;
    shouldFollowStreamRef.current = distanceFromBottom < 120;
  }, []);

  const sendMessage = useCallback(async () => {
    const content = composerValue.trim();
    if (
      (!content && !attachments.length) ||
      sendingMessage ||
      awaitingPersistedAssistant
    )
      return;

    let session = activeChatId
      ? queryClient.getQueryData<Chat>(sessionQueryKeys.detail(activeChatId))
      : null;
    if (!session && unusedChat) session = openUnusedChat(unusedChat);
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
    sendMessageRequest({
      attachments,
      content,
      displayContent,
      models: requestModels,
      sessionId,
      temporaryAssistantIds,
      temporaryUserId,
    });
  }, [
    activeChatId,
    attachments,
    awaitingPersistedAssistant,
    chatMode,
    composerValue,
    createSession,
    modelsQuery.data?.fallbackModel,
    openUnusedChat,
    queryClient,
    selectedBranchModels,
    selectedModel,
    sendMessageRequest,
    sendingMessage,
    setAttachments,
    setComposerValue,
    unusedChat,
  ]);

  const models = useMemo(
    () => modelsQuery.data?.models ?? [],
    [modelsQuery.data?.models],
  );
  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );
  const savedResponses = useMemo(
    () => libraryQuery.data ?? [],
    [libraryQuery.data],
  );
  const closeMobileSidebar = useCallback(
    () => setMobileSidebarOpen(false),
    [setMobileSidebarOpen],
  );
  const openMobileSidebar = useCallback(
    () => setMobileSidebarOpen(true),
    [setMobileSidebarOpen],
  );
  const loadMoreChats = useCallback(() => {
    if (!hasNextSessionPage || fetchingSessions) return;
    void fetchNextSessionPage();
  }, [
    fetchNextSessionPage,
    fetchingSessions,
    hasNextSessionPage,
  ]);
  const openLibrary = useCallback(() => {
    setActiveDialog("library");
    setMobileSidebarOpen(false);
  }, [setActiveDialog, setMobileSidebarOpen]);
  const openSearch = useCallback(() => {
    setActiveDialog("search");
    setMobileSidebarOpen(false);
  }, [setActiveDialog, setMobileSidebarOpen]);
  const toggleTheme = useCallback(
    () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    [setTheme],
  );
  const deleteResponse = useCallback(
    (message: Message) => {
      if (!activeChatId) return;
      deleteResponseById({
        messageId: message.id,
        sessionId: activeChatId,
      });
    },
    [activeChatId, deleteResponseById],
  );
  const saveResponse = useCallback(
    (message: Message) =>
      saveResponseById({ messageId: message.id }),
    [saveResponseById],
  );
  const removeAttachment = useCallback(
    (id: string) =>
      setAttachments((current) =>
        current.filter((attachment) => attachment.id !== id),
      ),
    [setAttachments],
  );
  const closeDialog = useCallback(
    () => setActiveDialog(null),
    [setActiveDialog],
  );
  const selectSearchChat = useCallback(
    (chatId: string) => {
      setActiveDialog(null);
      openChat(chatId);
    },
    [openChat, setActiveDialog],
  );
  const deleteSavedResponse = useCallback(
    (savedResponseId: string) =>
      deleteSavedResponseById(savedResponseId),
    [deleteSavedResponseById],
  );

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
        hasMoreChats={Boolean(sessionsQuery.hasNextPage)}
        loadingChats={loadingChats}
        loadingMoreChats={sessionsQuery.isFetchingNextPage}
        loadingProjects={loadingProjects}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
        onCreateProject={createProject}
        onDeleteProject={deleteProject}
        onDeleteChat={deleteChat}
        onLoadMoreChats={loadMoreChats}
        onNewChat={startNewChat}
        onOpenLibrary={openLibrary}
        onRenameProject={renameProject}
        onRenameChat={renameChat}
        onSelectChat={openChat}
        onSelectProject={selectProject}
        onSearchChats={openSearch}
        onToggle={toggleSidebar}
        onToggleTheme={toggleTheme}
        projects={projects}
        selectedProjectId={selectedProjectId}
        theme={theme}
      />

      <main className="relative flex min-w-0 flex-1 flex-col bg-white dark:bg-black">
        <header className="flex h-14 shrink-0 items-center justify-between px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-1">
            <IconButton
              className="lg:hidden"
              label="Open sidebar"
              onClick={openMobileSidebar}
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
              models={models}
              onDeleteResponse={deleteResponse}
              onSaveResponse={saveResponse}
              savingMessageId={
                saveResponseMutation.isPending
                  ? (saveResponseMutation.variables?.messageId ?? null)
                  : null
              }
              streamingMessageIds={activeStreamingMessageIds}
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
            models={models}
            onAddFiles={addFiles}
            onBranchModelsChange={selectBranchModels}
            onChange={setComposerValue}
            onModeChange={selectChatMode}
            onModelChange={selectModel}
            onRemoveAttachment={removeAttachment}
            onSubmit={sendMessage}
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

      {activeDialog === "search" && (
        <SearchChatsDialog
          onClose={closeDialog}
          onSelect={selectSearchChat}
        />
      )}
      {activeDialog === "library" && (
        <LibraryDialog
          deletingResponseId={
            deleteSavedResponseMutation.isPending
              ? (deleteSavedResponseMutation.variables ?? null)
              : null
          }
          error={libraryQuery.error?.message}
          loading={libraryQuery.isLoading}
          onClose={closeDialog}
          onDelete={deleteSavedResponse}
          responses={savedResponses}
        />
      )}
    </div>
  );
};
