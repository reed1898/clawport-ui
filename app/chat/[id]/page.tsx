"use client";
import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import type { Agent, ChatMessage } from "@/lib/types";

function timeStr(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function shouldShowAvatar(messages: ChatMessage[], index: number): boolean {
  if (messages[index].role !== "assistant") return false;
  if (index === 0) return true;
  return messages[index - 1].role === "user";
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((agents: Agent[]) => {
        const found = agents.find((a) => a.id === id);
        setAgent(found || null);
        if (found) {
          setMessages([
            {
              role: "assistant",
              content: `I'm ${found.name}. ${found.description} What do you need?`,
              timestamp: Date.now(),
            },
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch(`/api/chat/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const chunk = JSON.parse(line.slice(6));
              if (chunk.content) {
                setMessages((prev) => {
                  const msgs = [...prev];
                  msgs[msgs.length - 1] = {
                    ...msgs[msgs.length - 1],
                    content:
                      msgs[msgs.length - 1].content + chunk.content,
                  };
                  return msgs;
                });
              }
            } catch {
              /* skip malformed chunks */
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content: "Error getting response. Check API connection.",
        };
        return msgs;
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    if (!agent) return;
    setMessages([
      {
        role: "assistant",
        content: `I'm ${agent.name}. ${agent.description} What do you need?`,
        timestamp: Date.now(),
      },
    ]);
  }

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg)' }}>
        <span className="text-[15px] animate-pulse" style={{ color: 'var(--accent)' }}>
          Connecting...
        </span>
      </div>
    );
  }

  /* ─── Not found state ─── */
  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: 'var(--bg)' }}>
        <span className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          Agent not found
        </span>
        <Link
          href="/"
          className="text-[15px] hover:underline"
          style={{ color: 'var(--blue)' }}
        >
          &larr; Back to Agents
        </Link>
      </div>
    );
  }

  const hasInput = input.trim().length > 0;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* ─── Color stripe ─── */}
      <div
        className="h-[3px] w-full flex-shrink-0"
        style={{ backgroundColor: agent.color }}
      />

      {/* ─── Header ─── */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ background: 'var(--bg-elevated)', boxShadow: `0 1px 0 var(--border)` }}
      >
        {/* Left — back link */}
        <Link
          href="/"
          className="text-[15px] hover:opacity-80 transition-opacity flex-shrink-0"
          style={{ color: 'var(--blue)' }}
        >
          &larr; Agents
        </Link>

        {/* Center — agent identity */}
        <div className="flex flex-col items-center min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[17px]">{agent.emoji}</span>
            <span className="text-[17px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {agent.name}
            </span>
          </div>
          <span className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {agent.title}
          </span>
        </div>

        {/* Right — clear button */}
        <button
          onClick={clearChat}
          className="hover:opacity-80 transition-colors text-[15px] flex-shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
          title="Clear conversation"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 5h14" />
            <path d="M8 5V3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V5" />
            <path d="M5 5l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" />
            <path d="M8.5 9v5" />
            <path d="M11.5 9v5" />
          </svg>
        </button>
      </div>

      {/* ─── Messages ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1" style={{ background: 'var(--bg)' }}>
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const showAvatar = shouldShowAvatar(messages, i);
          const isLastAssistant =
            !isUser && i === messages.length - 1 && isStreaming;

          return (
            <div key={i} className="animate-fade-in">
              {/* Extra spacing before first message in a group */}
              {i > 0 && messages[i - 1].role !== msg.role && (
                <div className="h-3" />
              )}

              <div
                className={`group flex items-end gap-2 ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {/* Assistant avatar */}
                {!isUser && (
                  <div className="w-[24px] flex-shrink-0 mb-0.5">
                    {showAvatar ? (
                      <div
                        className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[12px]"
                        style={{ backgroundColor: agent.color }}
                      >
                        {agent.emoji}
                      </div>
                    ) : (
                      <div className="w-[24px]" />
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div className="max-w-[75%] flex flex-col">
                  <div
                    className={
                      isUser
                        ? "px-[14px] py-[10px] rounded-[20px] rounded-tr-[6px] text-[15px] font-medium text-black"
                        : "px-[14px] py-[10px] rounded-[20px] rounded-tl-[6px] text-[15px] glass-card msg-assistant"
                    }
                    style={
                      isUser
                        ? {
                            background:
                              "linear-gradient(135deg, var(--accent), #d4a800)",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                          }
                        : {
                            backgroundColor: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            boxShadow: "var(--shadow-sm)",
                            color: "var(--text-primary)",
                          }
                    }
                  >
                    {msg.content}
                    {isLastAssistant && !msg.content && (
                      <span className="animate-blink" style={{ color: 'var(--accent)' }}>
                        &#9612;
                      </span>
                    )}
                    {isLastAssistant && msg.content && (
                      <span className="animate-blink ml-0.5" style={{ color: 'var(--accent)' }}>
                        &#9612;
                      </span>
                    )}
                  </div>

                  {/* Timestamp on hover */}
                  <span
                    className={`text-[11px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                      isUser ? "text-right mr-1" : "text-left ml-1"
                    }`}
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {timeStr(msg.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ─── Input area ─── */}
      <div
        className="px-4 pt-3 pb-2 flex-shrink-0 chat-input-area"
        style={{ background: 'var(--bg-elevated)', boxShadow: `0 -1px 0 var(--border)` }}
      >
        <div className="flex items-end gap-2">
          {/* Input bubble */}
          <div
            className="flex-1 transition-colors duration-200"
            style={{ borderRadius: '20px', background: 'var(--bg-grouped)', border: '1px solid var(--border)' }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${agent.name}...`}
              rows={1}
              disabled={isStreaming}
              className="w-full bg-transparent px-4 py-2.5 text-[15px] resize-none focus:outline-none disabled:opacity-50"
              style={{
                minHeight: "40px",
                maxHeight: "120px",
                color: 'var(--text-primary)',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height =
                  Math.min(target.scrollHeight, 120) + "px";
              }}
              onFocus={(e) => {
                const parent = e.target.parentElement;
                if (parent) {
                  parent.style.borderColor = "var(--accent-ring)";
                }
              }}
              onBlur={(e) => {
                const parent = e.target.parentElement;
                if (parent) {
                  parent.style.borderColor = "var(--border)";
                }
              }}
            />
          </div>

          {/* Send button — gold circle, only visible when there is input */}
          <div
            className="flex-shrink-0 mb-0.5 transition-all duration-200"
            style={{
              opacity: hasInput ? 1 : 0,
              transform: hasInput ? "scale(1)" : "scale(0.6)",
              pointerEvents: hasInput ? "auto" : "none",
            }}
          >
            <button
              onClick={sendMessage}
              disabled={isStreaming || !hasInput}
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-black font-bold text-[18px] transition-all duration-150 active:scale-90 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--accent), #d4a800)",
              }}
              title="Send message"
            >
              &uarr;
            </button>
          </div>
        </div>

        {/* Helper text */}
        <p className="text-[11px] text-center mt-2 mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
          &#8629; Send &middot; &#8679;&#8629; New line
        </p>
      </div>
    </div>
  );
}
