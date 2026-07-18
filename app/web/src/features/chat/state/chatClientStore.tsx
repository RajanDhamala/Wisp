/* eslint-disable react-refresh/only-export-components -- Feature-scoped Zustand hooks share the provider module. */
import {
  createContext,
  type ReactNode,
  type SetStateAction,
  useContext,
  useRef,
} from "react";
import { createStore, useStore } from "zustand";
import { LANDING_DRAFT_STORAGE_KEY } from "@/Utils/LandingDraft";
import {
  BRANCH_MODELS_STORAGE_KEY,
  BRANCH_MODE_STORAGE_KEY,
  SELECTED_MODEL_STORAGE_KEY,
  SELECTED_PROJECT_STORAGE_KEY,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "../chatConstants";
import type {
  ChatDialog,
  ChatMode,
  PendingAttachment,
} from "../chatTypes";

type Theme = "light" | "dark";

type ChatClientState = {
  activeDialog: ChatDialog;
  attachments: PendingAttachment[];
  chatMode: ChatMode;
  composerValue: string;
  mobileSidebarOpen: boolean;
  selectedBranchModels: string[];
  selectedModel: string;
  selectedProjectId: string | null;
  sidebarCollapsed: boolean;
  streamingMessageIds: string[];
  theme: Theme;
  setActiveDialog: (value: SetStateAction<ChatDialog>) => void;
  setAttachments: (value: SetStateAction<PendingAttachment[]>) => void;
  setChatMode: (value: SetStateAction<ChatMode>) => void;
  setComposerValue: (value: SetStateAction<string>) => void;
  setMobileSidebarOpen: (value: SetStateAction<boolean>) => void;
  setSelectedBranchModels: (value: SetStateAction<string[]>) => void;
  setSelectedModel: (value: SetStateAction<string>) => void;
  setSelectedProjectId: (value: SetStateAction<string | null>) => void;
  setSidebarCollapsed: (value: SetStateAction<boolean>) => void;
  setStreamingMessageIds: (value: SetStateAction<string[]>) => void;
  setTheme: (value: SetStateAction<Theme>) => void;
};

type ChatClientStore = ReturnType<typeof createChatClientStore>;

const resolveUpdate = <Value,>(
  value: SetStateAction<Value>,
  current: Value,
): Value => (typeof value === "function"
  ? (value as (previous: Value) => Value)(current)
  : value);

const readBranchModels = () => {
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
};

const readTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const createChatClientStore = () =>
  createStore<ChatClientState>((set) => ({
    activeDialog: null,
    attachments: [],
    chatMode:
      typeof window !== "undefined" &&
      window.localStorage.getItem(BRANCH_MODE_STORAGE_KEY) === "branching"
        ? "branching"
        : "normal",
    composerValue:
      typeof window === "undefined"
        ? ""
        : (window.localStorage.getItem(LANDING_DRAFT_STORAGE_KEY) ?? ""),
    mobileSidebarOpen: false,
    selectedBranchModels: readBranchModels(),
    selectedModel:
      typeof window === "undefined"
        ? ""
        : (window.localStorage.getItem(SELECTED_MODEL_STORAGE_KEY) ?? ""),
    selectedProjectId:
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY),
    sidebarCollapsed:
      typeof window !== "undefined" &&
      window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true",
    streamingMessageIds: [],
    theme: readTheme(),
    setActiveDialog: (value) =>
      set((state) => ({
        activeDialog: resolveUpdate(value, state.activeDialog),
      })),
    setAttachments: (value) =>
      set((state) => ({ attachments: resolveUpdate(value, state.attachments) })),
    setChatMode: (value) =>
      set((state) => ({ chatMode: resolveUpdate(value, state.chatMode) })),
    setComposerValue: (value) =>
      set((state) => ({
        composerValue: resolveUpdate(value, state.composerValue),
      })),
    setMobileSidebarOpen: (value) =>
      set((state) => ({
        mobileSidebarOpen: resolveUpdate(value, state.mobileSidebarOpen),
      })),
    setSelectedBranchModels: (value) =>
      set((state) => ({
        selectedBranchModels: resolveUpdate(value, state.selectedBranchModels),
      })),
    setSelectedModel: (value) =>
      set((state) => ({
        selectedModel: resolveUpdate(value, state.selectedModel),
      })),
    setSelectedProjectId: (value) =>
      set((state) => ({
        selectedProjectId: resolveUpdate(value, state.selectedProjectId),
      })),
    setSidebarCollapsed: (value) =>
      set((state) => ({
        sidebarCollapsed: resolveUpdate(value, state.sidebarCollapsed),
      })),
    setStreamingMessageIds: (value) =>
      set((state) => ({
        streamingMessageIds: resolveUpdate(value, state.streamingMessageIds),
      })),
    setTheme: (value) =>
      set((state) => ({ theme: resolveUpdate(value, state.theme) })),
  }));

const ChatClientStoreContext = createContext<ChatClientStore | null>(null);

export const ChatClientStoreProvider = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<ChatClientStore | null>(null);
  if (!storeRef.current) storeRef.current = createChatClientStore();

  return (
    <ChatClientStoreContext.Provider value={storeRef.current}>
      {children}
    </ChatClientStoreContext.Provider>
  );
};

export const useChatClientStore = <Value,>(
  selector: (state: ChatClientState) => Value,
) => {
  const store = useContext(ChatClientStoreContext);
  if (!store) {
    throw new Error(
      "useChatClientStore must be used inside ChatClientStoreProvider",
    );
  }
  return useStore(store, selector);
};
