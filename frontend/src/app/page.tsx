"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatDocument } from "@/components/chat/chat-composer";
import {
  AnimatePresence,
  MotionConfig,
  motion,
} from "motion/react";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatComposer } from "@/components/chat/chat-composer";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
};

type SavedMessage = Message & {
  conversation_id: number;
  created_at: string;
};

type ConversationDetail = Conversation & {
  messages: SavedMessage[];
};

type ChatApiResponse = {
  reply?: string;
  conversation_id?: number;
  detail?: string;
};

function getErrorMessage(
  data: unknown,
  fallback: string,
): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof data.detail === "string"
  ) {
    return data.detail;
  }

  return fallback;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  const [documents, setDocuments] = useState<ChatDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] =
    useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const refreshConversations = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/chats`);

    if (!response.ok) {
      throw new Error("Unable to load saved conversations.");
    }

    const data: Conversation[] = await response.json();

    setConversations(data);
    return data;
  }, []);

  const refreshDocuments = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/documents/`);

    if (!response.ok) {
      throw new Error("Unable to load your documents.");
    }

    const result: unknown = await response.json();

    // Support either a direct array or { documents: [...] }.
    const data: ChatDocument[] = Array.isArray(result)
      ? result
      : typeof result === "object" &&
        result !== null &&
        "documents" in result &&
        Array.isArray(result.documents)
        ? result.documents
        : [];

    setDocuments(data);

    setSelectedDocumentId((current) => {
      if (
        current &&
        !data.some((document) => document.id === current)
      ) {
        return null;
      }

      return current;
    });

    return data;
  }, []);

  const openChat = useCallback(
    async (chatId: number) => {
      if (isLoading) return;

      setIsLoadingChats(true);
      setPageError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/chats/${chatId}`,
        );

        if (!response.ok) {
          throw new Error("Unable to open this conversation.");
        }

        const data: ConversationDetail = await response.json();

        setActiveChatId(data.id);

        setMessages(
          data.messages
            .filter(
              (message) =>
                message.role === "user" ||
                message.role === "assistant",
            )
            .map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
            })),
        );

        setSidebarOpen(false);
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : "Unable to open this conversation.",
        );
      } finally {
        setIsLoadingChats(false);
      }
    },
    [isLoading],
  );

  const uploadDocument = useCallback(
    async (file: File) => {
      if (uploading) return;

      setUploadError(null);

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setUploadError("Please select a PDF file.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploadError("PDF files must be 15 MB or smaller.");
        return;
      }

      if (file.size === 0) {
        setUploadError("The selected PDF is empty.");
        return;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `${API_URL}/api/documents/upload`,
          {
            method: "POST",
            body: formData,
          },
        );

        const result: unknown = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(result, "Unable to upload this PDF."),
          );
        }

        const uploadedDocument = result as ChatDocument;

        if (!uploadedDocument?.id) {
          throw new Error(
            "The server uploaded the file but returned an invalid response.",
          );
        }

        await refreshDocuments();

        // Automatically select the newly uploaded document.
        setSelectedDocumentId(uploadedDocument.id);
      } catch (error) {
        setUploadError(
          error instanceof Error
            ? error.message
            : "Unable to upload this PDF. Check that the API is running.",
        );
      } finally {
        setUploading(false);
      }
    },
    [refreshDocuments, uploading],
  );

  // Load documents independently of conversation history.
  useEffect(() => {
    void refreshDocuments().catch((error) => {
      console.error("Failed to load documents:", error);
    });
  }, [refreshDocuments]);

  // Restore the most recently updated conversation on startup.
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setIsLoadingChats(true);

      try {
        const data = await refreshConversations();

        if (cancelled) return;

        if (data.length > 0) {
          const latest = data[0];

          if (!latest) return;

          const response = await fetch(
            `${API_URL}/api/chats/${latest.id}`,
          );

          if (!response.ok) {
            throw new Error(
              "Unable to restore the latest conversation.",
            );
          }

          const chat: ConversationDetail = await response.json();

          if (cancelled) return;

          setActiveChatId(chat.id);

          setMessages(
            chat.messages
              .filter(
                (message) =>
                  message.role === "user" ||
                  message.role === "assistant",
              )
              .map((message) => ({
                id: message.id,
                role: message.role,
                content: message.content,
              })),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Unable to initialize NeuraChat.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingChats(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [refreshConversations]);

  async function sendMessage(content: string) {
    const message = content.trim();

    if (!message || isLoading || isLoadingChats) return;

    const userId = Date.now();
    const assistantId = userId + 1;

    setPageError(null);

    setMessages((previous) => [
      ...previous,
      { id: userId, role: "user", content: message },
      {
        id: assistantId,
        role: "assistant",
        content: "Thinking...",
      },
    ]);

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          ...(activeChatId !== null
            ? { conversation_id: activeChatId }
            : {}),

          // FastAPI expects a list, even when one PDF is selected.
          document_ids: selectedDocumentId
            ? [selectedDocumentId]
            : [],
        }),
      });

      const data: ChatApiResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "The AI request failed. Please try again.",
          ),
        );
      }

      if (
        typeof data.reply !== "string" ||
        !data.reply.trim() ||
        typeof data.conversation_id !== "number"
      ) {
        throw new Error("The server returned an invalid response.");
      }

      setActiveChatId(data.conversation_id);

      setMessages((previous) =>
        previous.map((item) =>
          item.id === assistantId
            ? { ...item, content: data.reply! }
            : item,
        ),
      );

      await refreshConversations();
    } catch (error) {
      console.error("NeuraChat request failed:", error);

      const errorMessage =
        error instanceof Error && error.message !== "Failed to fetch"
          ? error.message
          : `Unable to connect to NeuraChat. Make sure FastAPI is running at ${API_URL}.`;

      setMessages((previous) =>
        previous.map((item) =>
          item.id === assistantId
            ? { ...item, content: `Error: ${errorMessage}` }
            : item,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function renameChat(chatId: number, title: string) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const data: unknown = await response
        .json()
        .catch(() => null);

      throw new Error(
        getErrorMessage(data, "Unable to rename this conversation."),
      );
    }

    await refreshConversations();
  }

  async function deleteChat(chatId: number) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data: unknown = await response
        .json()
        .catch(() => null);

      throw new Error(
        getErrorMessage(data, "Unable to delete this conversation."),
      );
    }

    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
    }

    await refreshConversations();
  }

  function newChat() {
    if (isLoading) return;

    setActiveChatId(null);
    setMessages([]);
    setPageError(null);
    setSidebarOpen(false);
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex h-dvh overflow-hidden bg-[#0a0a0a] text-[#fafafa] selection:bg-orange-500/30"
      >
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              key="sidebar"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="h-full shrink-0"
            >
              <ChatSidebar
                conversations={conversations}
                activeChatId={activeChatId}
                onNewChat={newChat}
                onSelectChat={openChat}
                onRenameChat={renameChat}
                onDeleteChat={deleteChat}
                onClose={() => setSidebarOpen(false)}
                disabled={isLoading || isLoadingChats}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section
          layout
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex min-w-0 flex-1 flex-col"
        >
          {pageError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive"
            >
              <span>{pageError}</span>
              <button
                type="button"
                onClick={() => setPageError(null)}
                className="shrink-0 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <ChatHeader
              onOpenSidebar={() => setSidebarOpen(true)}
            />
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeChatId ?? "new-chat"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
              <ChatMessages
                messages={messages}
                onSuggestion={sendMessage}
              />
            </motion.div>
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
          >
            <ChatComposer
              onSend={sendMessage}
              onUpload={uploadDocument}
              documents={documents}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={setSelectedDocumentId}
              uploading={uploading}
              uploadError={uploadError}
              disabled={isLoading || isLoadingChats}
            />
          </motion.div>
        </motion.section>
      </motion.main>
    </MotionConfig>
  );
}
