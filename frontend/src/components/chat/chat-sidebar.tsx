
"use client";

import { useMemo, useState } from "react";
import {
    Bot,
    Check,
    MessageSquare,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";

type Conversation = {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
    message_count?: number;
};

type ChatSidebarProps = {
    conversations: Conversation[];
    activeChatId: number | null;
    onNewChat: () => void;
    onSelectChat: (chatId: number) => void;
    onRenameChat: (chatId: number, title: string) => Promise<void>;
    onDeleteChat: (chatId: number) => Promise<void>;
    onClose: () => void;
    disabled?: boolean;
};

export function ChatSidebar({
    conversations,
    activeChatId,
    onNewChat,
    onSelectChat,
    onRenameChat,
    onDeleteChat,
    onClose,
    disabled = false,
}: ChatSidebarProps) {
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [menuId, setMenuId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const filteredConversations = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...conversations]
            .sort(
                (a, b) =>
                    new Date(b.updated_at).getTime() -
                    new Date(a.updated_at).getTime(),
            )
            .filter((conversation) =>
                conversation.title.toLowerCase().includes(query),
            );
    }, [conversations, search]);

    async function saveRename(id: number) {
        const title = editTitle.trim();
        if (!title || saving) return;

        setSaving(true);
        try {
            await onRenameChat(id, title);
            setEditingId(null);
            setEditTitle("");
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        if (deleteTarget === null || saving) return;

        setSaving(true);
        try {
            await onDeleteChat(deleteTarget);
            setDeleteTarget(null);
            setMenuId(null);
        } finally {
            setSaving(false);
        }
    }

    return (
        <aside className="flex h-full min-h-0 w-full flex-col border-r border-[#302B23] bg-[#0F0F0D] text-[#F2EEE6]">
            <div className="flex h-[72px] shrink-0 items-center justify-between px-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#514022] bg-[#201B11]">
                        <Bot className="h-5 w-5 text-[#D6A84F]" />
                        <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[#0F0F0D] bg-[#D6A84F]" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight">
                            NeuraChat
                        </p>
                        <p className="mt-1 text-[10px] tracking-[0.13em] text-[#8D877D]">
                            PERSONAL WORKSPACE
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close sidebar"
                    className="rounded-md p-1.5 text-[#716A5F] transition hover:bg-[#211E18] hover:text-[#E5C477]"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="px-3 pb-5 pt-2">
                <button
                    type="button"
                    onClick={onNewChat}
                    disabled={disabled}
                    className="flex h-11 w-full items-center gap-2.5 rounded-lg bg-[#D6A84F] px-3.5 text-sm font-medium text-[#17120A] transition hover:bg-[#E5C477] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Plus className="h-4 w-4" />
                    <span>New conversation</span>
                    <span className="ml-auto text-xs opacity-60">↵</span>
                </button>
            </div>

            <div className="px-3">
                <div className="flex items-center gap-2 rounded-lg border border-[#302B23] bg-[#151410] px-3 transition focus-within:border-[#79602F]">
                    <Search className="h-3.5 w-3.5 shrink-0 text-[#716A5F]" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Find a conversation..."
                        aria-label="Search conversations"
                        className="h-10 min-w-0 flex-1 bg-transparent text-xs text-[#E7E1D7] outline-none placeholder:text-[#716A5F]"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            aria-label="Clear search"
                            className="text-[#716A5F] hover:text-[#E5C477]"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-7 flex items-center justify-between px-4">
                <span className="text-[10px] tracking-[0.16em] text-[#8D877D]">
                    RECENT CHATS
                </span>
                <span className="font-mono text-[10px] text-[#625D54]">
                    {String(filteredConversations.length).padStart(2, "0")}
                </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-3">
                {filteredConversations.length === 0 ? (
                    <div className="px-3 py-5">
                        <MessageSquare className="mb-3 h-4 w-4 text-[#716A5F]" />
                        <p className="text-xs text-[#C7C0B5]">
                            {search ? "No matching chats" : "Your next idea starts here."}
                        </p>
                        <p className="mt-1.5 text-[11px] leading-5 text-[#716A5F]">
                            {search
                                ? "Try a different search."
                                : "Start a conversation to see your recent work here."}
                        </p>
                        {!search && (
                            <button
                                type="button"
                                onClick={onNewChat}
                                disabled={disabled}
                                className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-[#D6A84F] transition hover:text-[#E5C477] disabled:opacity-50"
                            >
                                Start a conversation <Plus className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredConversations.map((conversation) => {
                            const active = conversation.id === activeChatId;
                            const editing = editingId === conversation.id;
                            const menuOpen = menuId === conversation.id;

                            return (
                                <div
                                    key={conversation.id}
                                    className={`group relative flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 ${active
                                            ? "border-[#514022]/70 bg-[#201B11]"
                                            : "border-transparent hover:border-[#302B23] hover:bg-[#171612]"
                                        }`}
                                >
                                    <MessageSquare
                                        className={`h-4 w-4 shrink-0 ${active ? "text-[#D6A84F]" : "text-[#716A5F]"
                                            }`}
                                    />

                                    {editing ? (
                                        <form
                                            className="flex min-w-0 flex-1 items-center gap-1"
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                void saveRename(conversation.id);
                                            }}
                                        >
                                            <input
                                                autoFocus
                                                value={editTitle}
                                                onChange={(event) => setEditTitle(event.target.value)}
                                                aria-label="Conversation title"
                                                className="h-7 min-w-0 flex-1 rounded border border-[#514022] bg-[#0F0F0D] px-2 text-xs outline-none"
                                            />
                                            <button
                                                type="submit"
                                                disabled={saving || !editTitle.trim()}
                                                aria-label="Save title"
                                                className="rounded p-1 text-[#D6A84F] hover:bg-[#302B23] disabled:opacity-40"
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingId(null)}
                                                aria-label="Cancel rename"
                                                className="rounded p-1 text-[#716A5F] hover:bg-[#302B23]"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </form>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => onSelectChat(conversation.id)}
                                                className="min-w-0 flex-1 text-left"
                                            >
                                                <span
                                                    className={`block truncate text-xs ${active ? "text-[#F2EEE6]" : "text-[#B8B1A6]"
                                                        }`}
                                                >
                                                    {conversation.title || "New conversation"}
                                                </span>
                                                <span className="mt-1 block text-[10px] text-[#716A5F]">
                                                    {conversation.message_count !== undefined
                                                        ? `${conversation.message_count} messages`
                                                        : "Conversation"}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setMenuId(menuOpen ? null : conversation.id)
                                                }
                                                aria-label={`Options for ${conversation.title}`}
                                                className={`rounded-md p-1.5 text-[#716A5F] hover:bg-[#302B23] hover:text-[#E5C477] ${menuOpen
                                                        ? "opacity-100"
                                                        : "sm:opacity-0 sm:group-hover:opacity-100"
                                                    }`}
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}

                                    {menuOpen && !editing && (
                                        <div className="absolute right-2 top-10 z-20 w-36 rounded-lg border border-[#3A3429] bg-[#191713] p-1 shadow-xl">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingId(conversation.id);
                                                    setEditTitle(conversation.title);
                                                    setMenuId(null);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-[#D6D0C7] hover:bg-[#29251D]"
                                            >
                                                <Pencil className="h-3.5 w-3.5" /> Rename
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDeleteTarget(conversation.id);
                                                    setMenuId(null);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-[#D98979] hover:bg-[#30201B]"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="shrink-0 border-t border-[#302B23] p-3">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#514022] bg-[#201B11] text-xs font-semibold text-[#D6A84F]">
                        N
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[#E7E1D7]">
                            NeuraChat
                        </p>
                        <p className="mt-1 text-[10px] text-[#716A5F]">
                            Personal workspace
                        </p>
                    </div>
                </div>
            </div>

            {deleteTarget !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-chat-title"
                        className="w-full max-w-sm rounded-xl border border-[#3A3429] bg-[#151410] p-5 shadow-2xl"
                    >
                        <h2
                            id="delete-chat-title"
                            className="text-sm font-semibold text-[#F2EEE6]"
                        >
                            Delete conversation?
                        </h2>
                        <p className="mt-2 text-xs leading-5 text-[#A8A29E]">
                            This permanently deletes the selected conversation and its
                            messages.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={saving}
                                className="rounded-lg border border-[#302B23] px-3 py-2 text-xs text-[#C7C0B5] hover:bg-[#242018]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmDelete()}
                                disabled={saving}
                                className="rounded-lg bg-[#A64F40] px-3 py-2 text-xs font-medium text-white hover:bg-[#BB5D4C] disabled:opacity-50"
                            >
                                {saving ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
