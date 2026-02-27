"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", icon: "🗺️", label: "Manor Map" },
  { href: "/crons", icon: "⏰", label: "Cron Monitor" },
  { href: "/memory", icon: "🧠", label: "Memory" },
];

export function NavLinks() {
  const pathname = usePathname();
  const [agentCount, setAgentCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((agents: unknown[]) => setAgentCount(agents.length))
      .catch(() => {});
  }, []);

  return (
    <nav className="flex-1 flex flex-col">
      <div className="px-2 py-3">
        <div className="px-3 mb-1 text-[10px] font-semibold tracking-[0.08em]" style={{ color: 'var(--text-tertiary)' }}>
          WORKSPACE
        </div>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg transition-all duration-150 ${
                  isActive
                    ? "font-semibold"
                    : "hover:text-white"
                }`}
                style={isActive
                  ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
                  : { color: 'var(--text-secondary)' }
                }
              >
                <span className="w-[18px] h-[18px] flex items-center justify-center text-sm flex-shrink-0">
                  {item.icon}
                </span>
                <span className="text-[13px] font-medium">{item.label}</span>
                {item.href === "/" && agentCount !== null && (
                  <span
                    className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ color: 'var(--text-secondary)', background: 'var(--bg-grouped)' }}
                  >
                    {agentCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1" />
      <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-3 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0"
            style={{ background: 'var(--bg-grouped)', color: 'var(--text-secondary)' }}
          >
            JR
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>John Rice</div>
            <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Owner</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
