import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { sessionQueryKeys } from "../chatApi";
import type {
  Chat,
  Message,
  SessionPage,
  SessionPages,
} from "../chatTypes";
import { sortSessions } from "../chatUtils";

export const useSessionCache = () => {
  const queryClient = useQueryClient();

  const updateSessionMessages = useCallback(
    (sessionId: string, update: (messages: Message[]) => Message[]) => {
      queryClient.setQueryData<Chat>(
        sessionQueryKeys.detail(sessionId),
        (chat) => {
          if (!chat) return chat;
          const messages = update(chat.messages);
          return { ...chat, messageCount: messages.length, messages };
        },
      );
    },
    [queryClient],
  );

  const updateSessionLists = useCallback(
    (update: (chats: Chat[]) => Chat[]) => {
      queryClient.setQueriesData<SessionPages>(
        { queryKey: sessionQueryKeys.lists },
        (current) =>
          current
            ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: update(page.items),
              })),
            }
            : current,
      );
    },
    [queryClient],
  );

  const invalidateSessionCollections = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: sessionQueryKeys.lists });
    void queryClient.invalidateQueries({
      queryKey: sessionQueryKeys.searches,
    });
  }, [queryClient]);

  const upsertCreatedSession = useCallback(
    (chat: Chat) => {
      const listQueries = queryClient.getQueriesData<SessionPages>({
        queryKey: sessionQueryKeys.lists,
      });

      for (const [queryKey, current] of listQueries) {
        if (!current) continue;
        const projectFilter = (
          queryKey[2] as { projectId?: string | null } | undefined
        )?.projectId;
        if (projectFilter && projectFilter !== chat.projectId) continue;

        queryClient.setQueryData<SessionPages>(queryKey, {
          ...current,
          pages: current.pages.map((page, index) => ({
            ...page,
            items:
              index === 0
                ? sortSessions([
                  chat,
                  ...page.items.filter((item) => item.id !== chat.id),
                ])
                : page.items.filter((item) => item.id !== chat.id),
          })),
        });
      }

      const searchQueries = queryClient.getQueriesData<SessionPage>({
        queryKey: sessionQueryKeys.searches,
      });
      for (const [queryKey, current] of searchQueries) {
        if (!current) continue;
        const search = String(queryKey[2] ?? "").trim().toLowerCase();
        const matches = chat.title.toLowerCase().includes(search);
        queryClient.setQueryData<SessionPage>(queryKey, {
          ...current,
          items: matches
            ? sortSessions([
              chat,
              ...current.items.filter((item) => item.id !== chat.id),
            ])
            : current.items.filter((item) => item.id !== chat.id),
        });
      }
    },
    [queryClient],
  );

  return {
    invalidateSessionCollections,
    upsertCreatedSession,
    updateSessionLists,
    updateSessionMessages,
  };
};
