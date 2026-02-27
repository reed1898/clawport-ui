"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Agent, CronJob } from "@/lib/types";

const ManorMap = dynamic(
  () => import("@/components/ManorMap").then((m) => ({ default: m.ManorMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-[13px] animate-pulse" style={{ color: 'var(--accent)' }}>
          Scanning the manor...
        </div>
      </div>
    ),
  }
);

const TOOL_ICONS: Record<string, string> = {
  web_search: "🔍",
  read: "📁",
  write: "✏️",
  exec: "💻",
  web_fetch: "🌐",
  message: "🔔",
  tts: "💬",
};

function StatusDot({ status }: { status: CronJob["status"] }) {
  const colors = {
    ok: "bg-[#30d158]",
    error: "bg-[#ff453a] animate-error-pulse",
    idle: "",
  };
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[status]}`}
      style={status === "idle" ? { background: 'var(--text-tertiary)' } : undefined}
    />
  );
}

export default function ManorPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then((r) => r.json()),
      fetch("/api/crons").then((r) => r.json()),
    ])
      .then(([a, c]) => {
        setAgents(a);
        setCrons(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const agentCrons = selected
    ? crons.filter((c) => c.agentId === selected.id)
    : [];

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-[13px]" style={{ color: 'var(--red)' }}>
        Error loading manor: {error}
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ background: 'var(--bg)' }}>
      {/* Map */}
      <div className="flex-1 h-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[13px] animate-pulse" style={{ color: 'var(--accent)' }}>
              Scanning the manor...
            </div>
          </div>
        ) : (
          <ManorMap agents={agents} crons={crons} onNodeClick={setSelected} />
        )}
      </div>

      {/* Agent detail panel */}
      {selected ? (
        <div
          className="w-[320px] flex-shrink-0 flex flex-col overflow-y-auto animate-slide-in glass-card"
          style={{
            background: 'var(--bg-elevated)',
            boxShadow: "-2px 0 20px rgba(0,0,0,0.5)",
          }}
        >
          {/* Close button row */}
          <div className="px-5 pt-4 pb-0 flex justify-end">
            <button
              onClick={() => setSelected(null)}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors text-[13px]"
              style={{ background: 'var(--bg-fill-2)', color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>

          {/* Header — glass gradient overlay */}
          <div className="px-5 pt-1 pb-4" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
            borderRadius: 'var(--radius) var(--radius) 0 0',
          }}>
            <div className="text-[40px] leading-none mb-2">{selected.emoji}</div>
            <h2 className="text-[22px] font-bold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
              {selected.name}
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {selected.title}
            </p>

            {/* Color indicator pill */}
            <span
              className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: `${selected.color}26`,
                color: selected.color,
              }}
            >
              {selected.color}
            </span>
          </div>

          {/* Description */}
          <div className="px-5 pb-4">
            <p className="text-[14px] leading-[1.6]" style={{ color: 'var(--text-secondary)' }}>
              {selected.description}
            </p>
          </div>

          {/* Tools section */}
          <div className="px-5 pb-4">
            <div className="text-[10px] font-semibold tracking-[0.08em] uppercase mt-5 mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Tools
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selected.tools.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--bg-fill-2)', color: 'var(--text-secondary)' }}
                >
                  {TOOL_ICONS[t] && (
                    <span className="text-[10px]">{TOOL_ICONS[t]}</span>
                  )}
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Crons section */}
          {agentCrons.length > 0 && (
            <div className="px-5 pb-4">
              <div className="text-[10px] font-semibold tracking-[0.08em] uppercase mt-5 mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Crons
              </div>
              <div className="space-y-2.5">
                {agentCrons.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <StatusDot status={c.status} />
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-mono truncate block" style={{ color: 'var(--text-primary)' }}>
                        {c.name}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {c.schedule}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions — pinned to bottom */}
          <div className="mt-auto px-5 py-5 space-y-2">
            <button
              onClick={() => router.push(`/chat/${selected.id}`)}
              className="w-full font-semibold text-[15px] py-3 rounded-xl transition-colors"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              Open Chat
            </button>
            <button
              onClick={() => router.push(`/agents/${selected.id}`)}
              className="w-full text-[15px] py-3 rounded-xl transition-colors"
              style={{ background: 'var(--bg-fill-2)', color: 'var(--text-primary)' }}
            >
              View Details
            </button>
          </div>
        </div>
      ) : (
        /* Empty state — no agent selected */
        <div
          className="w-[320px] flex-shrink-0 flex items-center justify-center glass-card"
          style={{
            background: 'var(--bg-elevated)',
            boxShadow: "-2px 0 20px rgba(0,0,0,0.5)",
          }}
        >
          <div className="text-center px-6">
            <div className="text-[48px] mb-3">🕵️</div>
            <div className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Select an agent
            </div>
            <div className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              Click any node on the map to inspect
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
