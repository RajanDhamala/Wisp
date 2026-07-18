import type { RefObject, SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { API_BASE_URL } from "@/Utils/ApiConfig";
import {
  consumeEventStream,
  getEventString,
  readResponseError,
  sessionQueryKeys,
} from "../chatApi";
import { STREAM_TOKEN_FLUSH_MS } from "../chatConstants";
import type {
  Chat,
  Message,
  ModelFallbackEvent,
  SendMessageVariables,
  StreamDoneEvent,
  StreamMessageEvent,
} from "../chatTypes";
import {
  groupSession,
  normalizeMessage,
  sortSessions,
} from "../chatUtils";

type UseSendMessageMutationOptions = {
  invalidateSessionCollections: () => void;
  setPageError: (value: SetStateAction<string | null>) => void;
  setSelectedModel: (value: SetStateAction<string>) => void;
  setStreamingMessageIds: (value: SetStateAction<string[]>) => void;
  shouldFollowStreamRef: RefObject<boolean>;
  updateSessionLists: (update: (chats: Chat[]) => Chat[]) => void;
  updateSessionMessages: (
    sessionId: string,
    update: (messages: Message[]) => Message[],
  ) => void;
};

export const useSendMessageMutation = ({
  invalidateSessionCollections,
  setPageError,
  setSelectedModel,
  setStreamingMessageIds,
  shouldFollowStreamRef,
  updateSessionLists,
  updateSessionMessages,
}: UseSendMessageMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation<
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
            updateSessionLists((chats) =>
              sortSessions(
                chats.map((chat) =>
                  chat.id === sessionId
                    ? {
                      ...chat,
                      messageCount:
                        chat.messageCount + 1 + assistantMessages.length,
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
      invalidateSessionCollections();
      void queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.detail(sessionId),
      });
    },
  });
};
