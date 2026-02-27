"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Agent, CronJob } from "@/lib/types";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

const statusColors: Record<string, { text: string; bg: string }> = {
  ok: { text: 'var(--green)', bg: 'rgba(48,209,88,0.1)' },
  error: { text: 'var(--red)', bg: 'rgba(255,69,58,0.1)' },
  idle: { text: 'var(--text-secondary)', bg: 'rgba(120,120,128,0.1)' },
};

const TOOL_ICONS: Record<string, string> = {
  web_search: "🔍",
  read: "📁",
  write: "✏️",
  exec: "💻",
  web_fetch: "🌐",
  message: "🔔",
  tts: "💬",
};

function SoulViewer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="rounded-apple max-h-96 overflow-y-auto flex" style={{ background: 'var(--bg)' }}>
      <div className="flex-shrink-0 px-3 py-4 select-none" style={{ borderRight: '1px solid var(--border-light)' }}>
        {lines.map((_, i) => (
          <div key={i} className="font-mono text-[11px] leading-relaxed text-right min-w-[2ch]" style={{ color: 'var(--text-tertiary)' }}>
            {i + 1}
          </div>
        ))}
      </div>
      <pre className="font-mono text-[12px] whitespace-pre-wrap leading-relaxed p-4 flex-1" style={{ color: 'var(--text-secondary)' }}>
        {content}
      </pre>
    </div>
  );
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/agents").then((r) => r.json()), fetch("/api/crons").then((r) => r.json())])
      .then(([agents, c]) => {
        setAllAgents(agents);
        setAgent(agents.find((a: Agent) => a.id === id) || null);
        setCrons(c.filter((cr: CronJob) => cr.agentId === id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-full text-[15px] animate-pulse" style={{ color: 'var(--accent)' }}>Loading agent...</div>;
  if (!agent) return <div className="flex items-center justify-center h-full text-[15px]" style={{ color: 'var(--text-secondary)' }}>Agent not found. <Link href="/" className="ml-1" style={{ color: 'var(--blue)' }}>← Back</Link></div>;

  const parent = agent.reportsTo ? allAgents.find((a) => a.id === agent.reportsTo) : null;
  const children = agent.directReports.map((cid) => allAgents.find((a) => a.id === cid)).filter(Boolean) as Agent[];

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
        style={{
          background: 'var(--bg-elevated)',
          borderTop: `3px solid ${agent.color}`,
          boxShadow: `0 1px 0 var(--border)`,
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-80 text-[15px] transition-opacity" style={{ color: 'var(--blue)' }}>← Map</Link>
          <div className="flex items-center gap-3">
            <span className="text-[28px]">{agent.emoji}</span>
            <div>
              <span className="font-bold text-[20px] tracking-tight" style={{ color: 'var(--text-primary)' }}>{agent.name}</span>
              <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{agent.title}</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push(`/chat/${agent.id}`)}
          className="font-semibold text-[15px] px-5 py-2.5 rounded-xl transition-colors"
          style={{ background: 'var(--accent)', color: '#000' }}
        >
          Open Chat
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5 p-6">
        {/* Left column */}
        <div className="col-span-1 space-y-4">
          {/* About */}
          <div
            className="relative overflow-hidden glass-card"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--sidebar-border)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              boxShadow: 'var(--shadow-sm), var(--inset-shine)',
            }}
          >
            <span
              className="absolute -bottom-2 -right-1 text-[48px] opacity-[0.04] select-none pointer-events-none"
              aria-hidden="true"
            >
              {agent.emoji}
            </span>
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-tertiary)' }}>About</div>
            <p className="text-[14px] leading-[1.6] relative" style={{ color: 'var(--text-secondary)' }}>{agent.description}</p>
          </div>

          {/* Tools */}
          <div
            className="glass-card"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--sidebar-border)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              boxShadow: 'var(--shadow-sm), var(--inset-shine)',
            }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2.5" style={{ color: 'var(--text-tertiary)' }}>Tools</div>
            <div className="grid grid-cols-2 gap-1.5">
              {agent.tools.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--bg-fill-2)', color: 'var(--text-secondary)' }}
                >
                  {TOOL_ICONS[t] && <span className="text-[10px]">{TOOL_ICONS[t]}</span>}
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Voice */}
          <div
            className="glass-card"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--sidebar-border)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              boxShadow: 'var(--shadow-sm), var(--inset-shine)',
            }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-tertiary)' }}>Voice</div>
            {agent.voiceId ? (
              <div>
                <span className="inline-block text-[12px] px-2.5 py-0.5 rounded-full mb-1" style={{ background: 'rgba(191,90,242,0.1)', color: 'var(--purple)', border: '1px solid rgba(191,90,242,0.2)' }}>ElevenLabs</span>
                <div className="font-mono text-[11px] mt-1 break-all" style={{ color: 'var(--text-tertiary)' }}>{agent.voiceId}</div>
              </div>
            ) : (
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>No voice configured</span>
            )}
          </div>

          {/* Hierarchy */}
          <div
            className="glass-card"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--sidebar-border)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              boxShadow: 'var(--shadow-sm), var(--inset-shine)',
            }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--text-tertiary)' }}>Hierarchy</div>
            {parent && (
              <div className="mb-3">
                <div className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>Reports to</div>
                <Link href={`/agents/${parent.id}`} className="flex items-center gap-2 text-[14px] transition-colors" style={{ color: 'var(--text-primary)' }}>
                  <span>{parent.emoji}</span>
                  <span className="font-medium">{parent.name}</span>
                </Link>
              </div>
            )}
            {children.length > 0 && (
              <div>
                <div className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>Direct reports ({children.length})</div>
                <div className="space-y-1">
                  {children.map((c) => (
                    <Link key={c.id} href={`/agents/${c.id}`} className="flex items-center gap-2 text-[14px] transition-colors" style={{ color: 'var(--text-primary)' }}>
                      <span>{c.emoji}</span>
                      <span className="font-medium">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-4">
          {/* SOUL.md */}
          {agent.soul && (
            <div
              className="glass-card"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--sidebar-border)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                boxShadow: 'var(--shadow-sm), var(--inset-shine)',
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: 'var(--text-tertiary)' }}>SOUL.md</div>
              <SoulViewer content={agent.soul} />
            </div>
          )}

          {/* Crons */}
          <div
            className="glass-card"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--sidebar-border)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              boxShadow: 'var(--shadow-sm), var(--inset-shine)',
            }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Associated Crons {crons.length > 0 && `(${crons.length})`}
            </div>
            {crons.length === 0 ? (
              <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>No crons associated with this agent</div>
            ) : (
              <div className="rounded-apple overflow-hidden">
                {crons.map((c, i) => (
                  <div
                    key={c.id}
                    className="flex items-center px-4 py-3"
                    style={{
                      borderBottom: i < crons.length - 1 ? '1px solid var(--border-light)' : undefined,
                      background: c.status === "error" ? 'rgba(255,69,58,0.06)' : undefined,
                    }}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === "ok" ? "bg-[#30d158]" : c.status === "error" ? "bg-[#ff453a] animate-error-pulse" : ""}`}
                      style={c.status === "idle" ? { background: 'var(--text-tertiary)' } : undefined}
                    />
                    <span className="text-[14px] font-mono ml-3" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                    <span className="ml-auto text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{c.schedule}</span>
                    <span
                      className="ml-3 px-2 py-0.5 rounded-full text-[11px]"
                      style={{ color: statusColors[c.status]?.text, background: statusColors[c.status]?.bg }}
                    >
                      {c.status}
                    </span>
                    <span className="ml-3 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(c.nextRun)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
