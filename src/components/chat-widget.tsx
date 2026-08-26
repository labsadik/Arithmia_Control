"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  Copy,
  Database,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  User,
  X,
  BarChart3,
  Search,
  Table2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

const SUGGESTIONS = [
  {
    icon: Database,
    title: "What data do we have?",
    prompt:
      "Give me an overview of the important data currently available in the database.",
  },
  {
    icon: BarChart3,
    title: "Show me the statistics",
    prompt:
      "Analyze the database and give me the most useful statistics and numbers.",
  },
  {
    icon: Search,
    title: "Find important records",
    prompt:
      "Find the most important, recent, or unusual records in the database and explain them.",
  },
  {
    icon: Table2,
    title: "Show recent data",
    prompt:
      "Show me the latest records from the most relevant database tables.",
  },
  {
    icon: FileText,
    title: "Create a report",
    prompt:
      "Create a concise report based on the available database data.",
  },
  {
    icon: Sparkles,
    title: "Find insights",
    prompt:
      "Look through the available data and tell me the most useful insights you can find.",
  },
];

function getTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CodeBlock({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const code = String(children ?? "").replace(/\n$/, "");

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border/70 bg-black/[0.035] dark:bg-white/[0.035]">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Code
        </span>

        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="size-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3" />
              Copy
            </>
          )}
        </button>
      </div>

      <pre className="overflow-x-auto p-4 text-[12px] leading-6">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownMessage({
  content,
}: {
  content: string;
}) {
  return (
    <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-p:my-2 prose-headings:mb-2 prose-headings:mt-5 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:bg-transparent prose-pre:p-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },

          code({
            inline,
            children,
            ...props
          }: any) {
            if (inline) {
              return (
                <code
                  className="rounded-md border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[11px]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock>{children}</CodeBlock>;
          },

          a({
            children,
            href,
            ...props
          }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-2"
                {...props}
              >
                {children}
              </a>
            );
          },

          blockquote({ children }) {
            return (
              <blockquote className="my-4 border-l-2 border-primary/40 pl-4 text-muted-foreground">
                {children}
              </blockquote>
            );
          },

          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  {children}
                </table>
              </div>
            );
          },

          th({ children }) {
            return (
              <th className="border-b border-border bg-muted/50 px-3 py-2 text-left font-semibold">
                {children}
              </th>
            );
          },

          td({ children }) {
            return (
              <td className="border-b border-border/60 px-3 py-2">
                {children}
              </td>
            );
          },

          hr() {
            return (
              <hr className="my-5 border-border/60" />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </div>

      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border/60 bg-muted/70 px-4 py-3">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [showConnectionPopup, setShowConnectionPopup] =
    useState(false);

  const [copiedMessageId, setCopiedMessageId] =
    useState<string | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const connectionTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const [messages, setMessages] = useState<Message[]>([

    {
      id: "welcome",
      sender: "bot",
      text:
        "## Hello 👋\n\n" +
        "I'm **SUPER AI**. Ask me a question about your data and I'll query the connected database and explain the results.",
      timestamp: getTime(),
    },
  ]);

  const lastUserMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message) => message.sender === "user"
        ),
    [messages]
  );

  /*
   * ----------------------------------------------------------
   * OPEN / CONNECTION POPUP
   * ----------------------------------------------------------
   */

  const openChat = () => {
    setIsOpen(true);

    setShowConnectionPopup(true);

    if (connectionTimerRef.current) {
      clearTimeout(connectionTimerRef.current);
    }

    connectionTimerRef.current = setTimeout(() => {
      setShowConnectionPopup(false);
    }, 3000);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsExpanded(false);
    setShowConnectionPopup(false);

    if (connectionTimerRef.current) {
      clearTimeout(connectionTimerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
      }
    };
  }, []);

  /*
   * ----------------------------------------------------------
   * AUTO SCROLL
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!isOpen) return;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    });
  }, [messages, isOpen, isTyping]);

  /*
   * ----------------------------------------------------------
   * AUTO FOCUS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 180);

    return () => clearTimeout(timer);
  }, [isOpen]);

  /*
   * ----------------------------------------------------------
   * ESCAPE
   * ----------------------------------------------------------
   */

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !isOpen) {
        return;
      }

      if (isExpanded) {
        setIsExpanded(false);
      } else {
        closeChat();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isOpen, isExpanded]);

  /*
   * ----------------------------------------------------------
   * BODY SCROLL
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  /*
   * ----------------------------------------------------------
   * TEXTAREA RESIZE
   * ----------------------------------------------------------
   */

  const resizeTextarea = () => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      180
    )}px`;
  };

  /*
   * ----------------------------------------------------------
   * COPY MESSAGE
   * ----------------------------------------------------------
   */

  const copyMessage = async (
    message: Message
  ) => {
    try {
      await navigator.clipboard.writeText(
        message.text
      );

      setCopiedMessageId(message.id);

      setTimeout(() => {
        setCopiedMessageId(null);
      }, 1800);
    } catch (error) {
      console.error(
        "Failed to copy message:",
        error
      );
    }
  };

  /*
   * ----------------------------------------------------------
   * SEND PROMPT (WITH MEMORY)
   * ----------------------------------------------------------
   */

  const sendPrompt = async (
    prompt: string,
    overrideHistory?: Message[]
  ) => {
    if (!prompt.trim() || isTyping) return;

    const currentInput = prompt.trim();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: currentInput,
      timestamp: getTime(),
    };

    // Use override history if provided (for regeneration), else use current state.
    // We filter out the initial welcome message so it doesn't confuse the AI.
    const historyToSend = (overrideHistory || messages).filter(
      (m) => m.id !== "welcome" && m.text.trim()
    );

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const botMessageId =
      crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      {
        id: botMessageId,
        sender: "bot",
        text: "",
        timestamp: getTime(),
      },
    ]);

    try {
      const supabaseUrl =
        import.meta.env
          .VITE_SUPABASE_URL;

      const supabaseAnonKey =
        import.meta.env
          .VITE_SUPABASE_ANON_KEY;

      if (
        !supabaseUrl ||
        !supabaseAnonKey
      ) {
        throw new Error(
          "VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing."
        );
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/ai-chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${supabaseAnonKey}`,
          },

          body: JSON.stringify({
            prompt: currentInput,
            // Send prior conversation so the Edge Function can use memory
            messages: historyToSend.map((m) => ({
              role: m.sender === "bot" ? "assistant" : "user",
              content: m.text,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        let errorMessage =
          `HTTP ${response.status}`;

        try {
          const parsed =
            JSON.parse(errorText);

          errorMessage =
            parsed.error ||
            parsed.message ||
            errorMessage;
        } catch {
          if (errorText) {
            errorMessage =
              `${errorMessage}: ${errorText}`;
          }
        }

        throw new Error(errorMessage);
      }

      const reader =
        response.body?.getReader();

      if (!reader) {
        throw new Error(
          "Unable to open response stream."
        );
      }

      const decoder =
        new TextDecoder("utf-8");

      let accumulatedText = "";

      while (true) {
        const { done, value } =
          await reader.read();

        if (done) break;

        const chunk =
          decoder.decode(value, {
            stream: true,
          });

        accumulatedText += chunk;

        setMessages((prev) =>
          prev.map((message) =>
            message.id ===
            botMessageId
              ? {
                  ...message,
                  text: accumulatedText,
                }
              : message
          )
        );
      }

      const finalChunk =
        decoder.decode();

      if (finalChunk) {
        accumulatedText += finalChunk;

        setMessages((prev) =>
          prev.map((message) =>
            message.id ===
            botMessageId
              ? {
                  ...message,
                  text: accumulatedText,
                }
              : message
          )
        );
      }

      if (!accumulatedText.trim()) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id ===
            botMessageId
              ? {
                  ...message,
                  text:
                    "I didn't receive a response. Please try again.",
                }
              : message
          )
        );
      }
    } catch (error: any) {
      console.error(
        "SUPER AI Chat Error:",
        error
      );

      setMessages((prev) =>
        prev.map((message) =>
          message.id ===
          botMessageId
            ? {
                ...message,
                text:
                  "### Something went wrong\n\n" +
                  `⚠️ ${
                    error?.message ||
                    "Failed to communicate with SUPER AI."
                  }`,
              }
            : message
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  /*
   * ----------------------------------------------------------
   * FORM
   * ----------------------------------------------------------
   */

  const handleSend = async (
    event?: React.FormEvent
  ) => {
    event?.preventDefault();

    await sendPrompt(input);
  };

  /*
   * ----------------------------------------------------------
   * ENTER / SHIFT + ENTER
   * ----------------------------------------------------------
   */

  const handleTextareaKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (
        input.trim() &&
        !isTyping
      ) {
        void sendPrompt(input);
      }
    }
  };

  /*
   * ----------------------------------------------------------
   * REGENERATE (Smart Memory Truncation)
   * ----------------------------------------------------------
   */

  const regenerate = () => {
    if (!lastUserMessage || isTyping) return;

    // Find the index of the last user message
    const lastUserIndex = messages
      .map((m) => m.sender)
      .lastIndexOf("user");

    if (lastUserIndex !== -1) {
      // Truncate everything after (and including) the last user message
      const truncatedHistory = messages.slice(0, lastUserIndex);
      
      setMessages(truncatedHistory);
      
      // Re-send the last user prompt, passing the truncated history manually
      // to avoid race conditions with React state updates.
      void sendPrompt(lastUserMessage.text, truncatedHistory);
    }
  };

  /*
   * ----------------------------------------------------------
   * NEW CHAT
   * ----------------------------------------------------------
   */

  const newChat = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        sender: "bot",
        text:
          "## New conversation ✨\n\n" +
          "What would you like to know about your data?",
        timestamp: getTime(),
      },
    ]);

    setInput("");
    setIsTyping(false);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  return (
    <>
      {/* -------------------------------------------------- */}
      {/* MOBILE BACKDROP */}
      {/* -------------------------------------------------- */}

      {isOpen && !isExpanded && (
        <button
          type="button"
          aria-label="Close chat"
          onClick={closeChat}
          className="fixed inset-0 z-[59] bg-black/20 backdrop-blur-[2px] md:hidden"
        />
      )}

      {/* -------------------------------------------------- */}
      {/* MAIN CONTAINER */}
      {/* -------------------------------------------------- */}

      <div
        className={cn(
          "fixed right-5 bottom-5 z-[60] flex flex-col items-end font-sans",
          isExpanded &&
            "inset-0 right-0 bottom-0 items-stretch"
        )}
      >
        {/* ------------------------------------------------ */}
        {/* CONNECTION POPUP */}
        {/* ------------------------------------------------ */}

        {isOpen && showConnectionPopup && (
          <div
            className={cn(
              "pointer-events-none fixed z-[200]",
              "left-1/2 top-8 -translate-x-1/2",
              "animate-in fade-in slide-in-from-top-3 duration-300"
            )}
          >
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
              <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-4.5" />

                <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
              </div>

              <div>
                <div className="text-xs font-semibold">
                  SUPER AI
                </div>

                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />

                  <span>
                    AI agent is connected
                  </span>
                </div>
              </div>

              <Check className="ml-2 size-4 text-emerald-500" />
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* AI WINDOW */}
        {/* ------------------------------------------------ */}

        {isOpen && (
          <div
            className={cn(
              "flex flex-col overflow-hidden bg-background",
              "border border-border/70 shadow-2xl",
              "animate-in fade-in slide-in-from-bottom-4 duration-200",

              !isExpanded && [
                "mb-4",
                "h-[min(720px,calc(100vh-105px))]",
                "w-[calc(100vw-24px)]",
                "rounded-[24px]",
                "sm:w-[460px]",
              ],

              isExpanded && [
                "fixed inset-0 z-[100]",
                "h-screen w-screen",
                "rounded-none",
                "border-0",
              ]
            )}
          >
            {/* -------------------------------------------- */}
            {/* HEADER */}
            {/* -------------------------------------------- */}

            <div className="shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-xl">
              <div
                className={cn(
                  "mx-auto flex items-center justify-between",
                  isExpanded
                    ? "w-full max-w-6xl px-5 py-4 lg:px-8"
                    : "px-4 py-3.5"
                )}
              >
                {/* SUPER AI BRAND */}
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "relative flex shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
                      isExpanded
                        ? "size-11"
                        : "size-10"
                    )}
                  >
                    <Sparkles
                      className={cn(isExpanded ? "size-5" : "size-4.5")}
                    />

                    <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-background bg-emerald-500" />
                  </div>

                  <div className="min-w-0">
                    <h2
                      className={cn(
                        "truncate font-semibold tracking-tight",
                        isExpanded
                          ? "text-base"
                          : "text-sm"
                      )}
                    >
                      SUPER AI
                    </h2>

                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-emerald-500" />

                      <span>
                        Connected
                      </span>
                    </div>
                  </div>
                </div>

                {/* HEADER ACTIONS */}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-xl"
                    title="New chat"
                    onClick={newChat}
                  >
                    <Plus className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-xl"
                    title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
                    onClick={() =>
                      setIsExpanded((value) => !value)
                    }
                  >
                    {isExpanded ? (
                      <Minimize2 className="size-4" />
                    ) : (
                      <Maximize2 className="size-4" />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-xl"
                    title="Close"
                    onClick={closeChat}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* -------------------------------------------- */}
            {/* MESSAGES */}
            {/* -------------------------------------------- */}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div
                className={cn(
                  "mx-auto w-full px-4 py-8 sm:px-6",
                  isExpanded
                    ? "max-w-4xl lg:px-8 lg:py-12"
                    : "max-w-none"
                )}
              >
                {/* ---------------------------------------- */}
                {/* WELCOME / SUGGESTIONS */}
                {/* ---------------------------------------- */}

                {messages.length === 1 &&
                  messages[0].sender === "bot" &&
                  !isTyping && (
                    <div className="mx-auto mb-10 max-w-3xl">
                      <div className="mb-7">
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Sparkles className="size-5" />
                          </div>

                          <div>
                            <h3
                              className={cn(
                                "font-semibold tracking-tight",
                                isExpanded ? "text-xl" : "text-lg"
                              )}
                            >
                              What do you want to know?
                            </h3>

                            <p className="mt-1 text-xs text-muted-foreground">
                              Ask a question and SUPER AI will find the data for you.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* QUESTION CARDS */}

                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {SUGGESTIONS.map((suggestion) => {
                          const Icon = suggestion.icon;

                          return (
                            <button
                              key={suggestion.title}
                              type="button"
                              onClick={() =>
                                void sendPrompt(suggestion.prompt)
                              }
                              className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-background p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.025] hover:shadow-md"
                            >
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                <Icon className="size-4" />
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-semibold">
                                  {suggestion.title}
                                </div>

                                <div className="mt-1 text-[10px] leading-4 text-muted-foreground">
                                  {suggestion.prompt}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* ---------------------------------------- */}
                {/* CONVERSATION */}
                {/* ---------------------------------------- */}

                <div
                  className={cn(
                    "space-y-8",
                    isExpanded && "space-y-10"
                  )}
                >
                  {messages.map((message) => {
                    const isBot = message.sender === "bot";

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "group flex gap-3 sm:gap-4",
                          !isBot && "justify-end"
                        )}
                      >
                        {/* SUPER AI AVATAR */}

                        {isBot && (
                          <div
                            className={cn(
                              "mt-1 flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground",
                              isExpanded ? "size-9" : "size-7"
                            )}
                          >
                            <Sparkles
                              className={cn(isExpanded ? "size-4" : "size-3.5")}
                            />
                          </div>
                        )}

                        <div
                          className={cn(
                            "min-w-0",
                            isBot
                              ? "flex-1"
                              : isExpanded
                                ? "max-w-[78%]"
                                : "max-w-[86%]"
                          )}
                        >
                          {/* MESSAGE BODY */}

                          {isBot ? (
                            <div
                              className={cn(
                                "text-foreground",
                                isExpanded
                                  ? "text-[15px] leading-7"
                                  : "text-[13px] leading-6"
                              )}
                            >
                              {message.text ? (
                                <MarkdownMessage content={message.text} />
                              ) : isTyping ? (
                                <TypingIndicator />
                              ) : null}
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "rounded-2xl rounded-br-md bg-primary text-primary-foreground shadow-sm",
                                isExpanded
                                  ? "px-5 py-3.5 text-[15px] leading-6"
                                  : "px-3.5 py-2.5 text-[13px] leading-5"
                              )}
                            >
                              <div className="whitespace-pre-wrap break-words">
                                {message.text}
                              </div>
                            </div>
                          )}

                          {/* MESSAGE FOOTER */}

                          <div
                            className={cn(
                              "mt-2 flex items-center gap-2",
                              isBot ? "justify-start" : "justify-end"
                            )}
                          >
                            <span className="text-[9px] text-muted-foreground">
                              {message.timestamp}
                            </span>

                            {isBot &&
                              message.text &&
                              !isTyping && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void copyMessage(message)}
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                  >
                                    {copiedMessageId === message.id ? (
                                      <>
                                        <Check className="size-3" />
                                        Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="size-3" />
                                        Copy
                                      </>
                                    )}
                                  </button>

                                  {lastUserMessage && (
                                    <button
                                      type="button"
                                      onClick={regenerate}
                                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                    >
                                      <RefreshCw className="size-3" />
                                      Regenerate
                                    </button>
                                  )}
                                </>
                              )}
                          </div>
                        </div>

                        {/* USER AVATAR */}

                        {!isBot && (
                          <div
                            className={cn(
                              "mt-1 flex shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground",
                              isExpanded ? "size-9" : "size-7"
                            )}
                          >
                            <User
                              className={cn(isExpanded ? "size-4" : "size-3.5")}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* -------------------------------------------- */}
            {/* SUPER AI INPUT BAR */}
            {/* -------------------------------------------- */}

            <div className="shrink-0 border-t border-border/60 bg-background/95 px-3 pb-3 pt-3 backdrop-blur-xl sm:px-4 sm:pb-4">
              <div
                className={cn(
                  "mx-auto",
                  isExpanded ? "max-w-4xl" : "max-w-none"
                )}
              >
                <form
                  onSubmit={handleSend}
                  className={cn(
                    "relative overflow-hidden rounded-[22px] border border-border/80 bg-muted/30 shadow-sm transition-all",
                    "focus-within:border-primary/40",
                    "focus-within:bg-background",
                    "focus-within:ring-2",
                    "focus-within:ring-primary/10",
                    isExpanded && "rounded-[26px]"
                  )}
                >
                  {/* TEXT AREA */}

                  <textarea
                    ref={textareaRef}
                    value={input}
                    rows={1}
                    disabled={isTyping}
                    placeholder={
                      isTyping
                        ? "SUPER AI is thinking..."
                        : "Ask SUPER AI anything about your data..."
                    }
                    onChange={(event) => {
                      setInput(event.target.value);
                      resizeTextarea();
                    }}
                    onKeyDown={handleTextareaKeyDown}
                    className={cn(
                      "max-h-[180px] min-h-[54px] w-full resize-none border-0 bg-transparent outline-none placeholder:text-muted-foreground/60 focus:ring-0 disabled:cursor-not-allowed",
                      isExpanded
                        ? "px-4 py-4 pr-16 text-[15px] leading-6"
                        : "px-4 py-3.5 pr-14 text-[13px] leading-5"
                    )}
                  />

                  {/* INPUT ACTIONS */}

                  <div
                    className={cn(
                      "flex items-center justify-between gap-2 px-3 pb-2.5",
                      isExpanded && "px-4 pb-3"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2 text-[9px] text-muted-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Sparkles className="size-3" />
                      </span>

                      <span className="truncate">
                        Ask questions about your database
                      </span>
                    </div>

                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim() || isTyping}
                      className={cn(
                        "shrink-0 rounded-xl transition-all",
                        isExpanded ? "size-10" : "size-9"
                      )}
                    >
                      {isTyping ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </div>
                </form>

                <div className="pt-2 text-center text-[9px] text-muted-foreground/50">
                  Enter to send · Shift + Enter for newline
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* FLOATING BUTTON */}
        {/* ------------------------------------------------ */}

        {!isExpanded && (
          <Button
            type="button"
            onClick={() => (isOpen ? closeChat() : openChat())}
            size="icon"
            aria-label={isOpen ? "Close SUPER AI" : "Open SUPER AI"}
            className={cn(
              "group relative size-14 rounded-full shadow-xl transition-all duration-200",
              "hover:scale-105 active:scale-95",
              isOpen
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "bg-primary text-primary-foreground"
            )}
          >
            <span className="absolute inset-0 rounded-full bg-primary/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />

            <span className="relative">
              {isOpen ? (
                <X className="size-6" />
              ) : (
                <Sparkles className="size-6" />
              )}
            </span>
          </Button>
        )}
      </div>
    </>
  );
}