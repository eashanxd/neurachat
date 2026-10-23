
"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertCircle,
  ArrowUp,
  FileText,
  LoaderCircle,
  Paperclip,
  X,
} from "lucide-react";

export type ChatDocument = {
  id: string;
  filename: string;
  size_bytes: number;
  chunk_count: number;
};

type ChatComposerProps = {
  onSend: (message: string) => void;
  onUpload: (file: File) => Promise<void>;
  documents: ChatDocument[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string | null) => void;
  uploading: boolean;
  uploadError: string | null;
  disabled?: boolean;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export function ChatComposer({
  onSend,
  onUpload,
  documents,
  selectedDocumentId,
  onSelectDocument,
  uploading,
  uploadError,
  disabled = false,
}: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? null;

  const canSend =
    message.trim().length > 0 && !disabled && !uploading;

  function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmed = message.trim();
    if (!trimmed || disabled || uploading) return;

    onSend(trimmed);
    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      submitMessage();
    }
  }

  function handleMessageChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value);

    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || disabled || uploading) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setLocalError("Please choose a PDF file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setLocalError("This PDF exceeds the 15 MB upload limit.");
      return;
    }

    setLocalError(null);

    try {
      await onUpload(file);
    } catch {
      setLocalError("The upload failed. Please try again.");
    }
  }

  return (
    <div className="shrink-0 bg-[#0C0C0B] px-4 pb-3 pt-2 sm:px-6 sm:pb-4">
      <div className="mx-auto max-w-4xl">
        {selectedDocument && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#514022]/60 bg-[#201B11]/50 px-3 py-2">
            <FileText className="h-4 w-4 shrink-0 text-[#D6A84F]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-[#E7E1D7]">
                {selectedDocument.filename}
              </p>
              <p className="mt-0.5 text-[10px] text-[#8D877D]">
                Document context enabled
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectDocument(null)}
              disabled={disabled}
              aria-label="Remove selected document context"
              className="rounded-md p-1.5 text-[#8D877D] hover:bg-[#302B23] hover:text-[#E5C477] disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={submitMessage}
          className="overflow-hidden rounded-xl border border-[#353026] bg-[#151410] transition-colors focus-within:border-[#79602F]"
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask, investigate, or think out loud..."
            aria-label="Message NeuraChat"
            disabled={disabled}
            rows={2}
            className="block max-h-[180px] min-h-[72px] w-full resize-none bg-transparent px-4 pb-3 pt-4 text-sm leading-6 text-[#F2EEE6] outline-none placeholder:text-[#716A5F] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
          />

          <div className="mx-4 border-t border-[#302B23] sm:mx-5" />

          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-[#8D877D]" />

              <label
                htmlFor="neura-document-context"
                className="hidden shrink-0 text-[11px] text-[#8D877D] sm:block"
              >
                Context
              </label>

              <select
                id="neura-document-context"
                value={selectedDocumentId ?? ""}
                onChange={(event) =>
                  onSelectDocument(event.target.value || null)
                }
                disabled={disabled || uploading}
                aria-label="Choose document context"
                className="h-8 min-w-0 max-w-full flex-1 cursor-pointer rounded-md border border-transparent bg-transparent px-1 text-xs text-[#D6D0C7] outline-none hover:border-[#302B23] focus:border-[#79602F] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[280px]"
              >
                <option value="" className="bg-[#151410]">
                  General chat · No document
                </option>
                {documents.map((document) => (
                  <option
                    key={document.id}
                    value={document.id}
                    className="bg-[#151410]"
                  >
                    {document.filename}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => void handleFileChange(event)}
                className="hidden"
                aria-label="Choose a PDF to upload"
              />

              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  fileInputRef.current?.click();
                }}
                disabled={disabled || uploading}
                className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs text-[#A8A29E] transition hover:bg-[#26221B] hover:text-[#E5C477] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {uploading ? "Processing..." : "Attach PDF"}
                </span>
              </button>

              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#D6A84F] text-[#17120A] transition hover:bg-[#E5C477] disabled:cursor-not-allowed disabled:bg-[#242018] disabled:text-[#625D54]"
              >
                {disabled ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-[17px] w-[17px]" />
                )}
              </button>
            </div>
          </div>
        </form>

        {uploading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#A8A29E]">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#D6A84F]" />
            <span>Reading your document and preparing its context...</span>
          </div>
        )}

        {(localError || uploadError) && (
          <div
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-lg border border-[#6B352C] bg-[#241512] px-3 py-2 text-xs text-[#E7A69A]"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{localError || uploadError}</span>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <p className="text-[10px] text-[#625D54]">PDF · Up to 15 MB</p>
          <p className="text-right text-[10px] text-[#625D54]">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>

        <p className="mt-2 text-center text-[10px] text-[#625D54]">
          NeuraChat can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
