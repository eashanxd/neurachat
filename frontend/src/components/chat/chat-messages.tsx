
"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Check,
  Copy,
  FileSearch,
  Network,
  Terminal,
  UserRound,
} from "lucide-react";
import "highlight.js/styles/github-dark.css";

export type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type ChatMessagesProps = {
  messages: Message[];
  onSuggestion: (prompt: string) => void;
};

const suggestions = [
  {
    number: "01",
    title: "Investigate a document",
    description: "Find evidence in your PDFs.",
    prompt:
      "Help me investigate a document. Show me how to identify important evidence and explain the relevant passages.",
    icon: FileSearch,
  },
  {
    number: "02",
    title: "Solve a problem",
    description: "Reason, debug, and build.",
    prompt:
      "Help me solve a technical problem step by step. Explain the reasoning behind each decision.",
    icon: Terminal,
  },
  {
    number: "03",
    title: "Explore a concept",
    description: "Connect ideas and understand why.",
    prompt:
      "Help me understand a technical concept, starting with intuition and progressing to the underlying details.",
    icon: Network,
  },
];

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyContent}
      aria-label="Copy response"
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#8D877D] transition hover:bg-[#211E18] hover:text-[#E5C477]"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function WelcomeScreen({
  onSuggestion,
}: {
  onSuggestion: (prompt: string) => void;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-6 pt-7 sm:px-8 sm:pt-10 lg:px-10">
      <div className="mb-7 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#514022] bg-[#201B11]">
          <BrainCircuit className="h-[18px] w-[18px] text-[#D6A84F]" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#F2EEE6]">
            NEURACHAT
          </p>
          <p className="mt-1 text-[10px] tracking-[0.16em] text-[#8D877D]">
            YOUR PERSONAL WORKSPACE
          </p>
        </div>
      </div>

      <div className="border-t border-[#302B23] pt-6 sm:pt-8">
        <p className="mb-3 text-[10px] tracking-[0.18em] text-[#D6A84F]">
          THINKING SPACE / 001
        </p>

        <h1 className="text-4xl font-medium leading-[1.08] tracking-[-0.055em] text-[#F2EEE6] sm:text-5xl lg:text-[56px]">
          Think clearly.
          <br />
          <span className="text-[#D6A84F]">Build deliberately.</span>
        </h1>

        <p className="mt-4 max-w-[570px] text-sm leading-6 text-[#A8A29E]">
          Explore a problem, question your documents, or turn an idea into
          something useful.
        </p>
      </div>

      <div className="mb-3 mt-7 flex items-center justify-between">
        <p className="text-[10px] tracking-[0.16em] text-[#8D877D]">
          START SOMETHING
        </p>
        <span className="font-mono text-[10px] text-[#625D54]">01 / 03</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;

          return (
            <button
              key={suggestion.number}
              type="button"
              onClick={() => onSuggestion(suggestion.prompt)}
              className="group flex min-h-[118px] flex-col rounded-lg border border-[#302B23] bg-[#11110F] p-3.5 text-left transition-colors hover:border-[#79602F] hover:bg-[#17140F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A84F] sm:p-4"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-[17px] w-[17px] text-[#D6A84F]" />
                <ArrowUpRight className="h-3.5 w-3.5 text-[#625D54] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#D6A84F]" />
              </div>

              <span className="mt-4 text-sm font-medium text-[#F2EEE6]">
                {suggestion.title}
              </span>
              <span className="mt-1 text-xs leading-5 text-[#8D877D]">
                {suggestion.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <article className="group flex gap-3 border-b border-[#211F1A] py-5 sm:gap-4">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isUser
            ? "border-[#302B23] bg-[#191713]"
            : "border-[#514022] bg-[#201B11]"
          }`}
      >
        {isUser ? (
          <UserRound className="h-4 w-4 text-[#A8A29E]" />
        ) : (
          <Bot className="h-4 w-4 text-[#D6A84F]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-2 text-xs font-medium text-[#E7E1D7]">
          {isUser ? "You" : "NeuraChat"}
        </p>

        {isUser ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-7 text-[#D6D0C7]">
            {message.content}
          </div>
        ) : (
          <div className="message-content min-w-0 break-words text-sm leading-7 text-[#D6D0C7]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                a: ({ children, href, ...props }) => (
                  <a
                    {...props}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#E5C477] underline decoration-[#79602F] underline-offset-4 hover:text-[#F5DEAA]"
                  >
                    {children}
                  </a>
                ),
                pre: ({ children }) => (
                  <pre className="my-4 overflow-x-auto rounded-lg border border-[#302B23] bg-[#090908] p-4 text-xs leading-6">
                    {children}
                  </pre>
                ),
                code: ({ className, children, ...props }) => {
                  const isBlock = Boolean(className?.includes("language-"));

                  return (
                    <code
                      {...props}
                      className={
                        isBlock
                          ? `${className ?? ""} font-mono`
                          : "rounded bg-[#242018] px-1.5 py-0.5 font-mono text-[0.88em] text-[#E5C477]"
                      }
                    >
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => (
                  <h1 className="mb-3 mt-6 text-xl font-semibold text-[#F2EEE6]">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-3 mt-6 text-lg font-semibold text-[#F2EEE6]">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-5 text-base font-semibold text-[#F2EEE6]">
                    {children}
                  </h3>
                ),
                p: ({ children }) => <p className="my-3">{children}</p>,
                ul: ({ children }) => (
                  <ul className="my-3 list-disc space-y-1.5 pl-6">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-3 list-decimal space-y-1.5 pl-6">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="pl-1">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="my-4 border-l-2 border-[#79602F] pl-4 text-[#A8A29E]">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="my-4 overflow-x-auto rounded-lg border border-[#302B23]">
                    <table className="w-full border-collapse text-left text-xs">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border-b border-[#302B23] bg-[#191713] px-3 py-2 font-medium text-[#E5C477]">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border-b border-[#24211C] px-3 py-2">
                    {children}
                  </td>
                ),
                hr: () => <hr className="my-5 border-[#302B23]" />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {!isUser && (
          <div className="mt-2 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <CopyButton content={message.content} />
          </div>
        )}
      </div>
    </article>
  );
}

export function ChatMessages({
  messages,
  onSuggestion,
}: ChatMessagesProps) {
  if (messages.length === 0) {
    return <WelcomeScreen onSuggestion={onSuggestion} />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-8 sm:px-8">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
