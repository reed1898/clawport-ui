"use client";
import { Handle, Position } from "@xyflow/react";
import type { Agent } from "@/lib/types";

interface AgentNodeProps {
  data: Agent & Record<string, unknown>;
}

export function AgentNode({ data }: AgentNodeProps) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 6, height: 6 }}
      />
      <div
        className="relative w-[160px] px-3 py-2.5 cursor-pointer select-none transition-all duration-150 glass-card"
        style={{
          borderRadius: 'var(--radius)',
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm), var(--inset-shine)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow =
            "var(--shadow-md), var(--inset-shine)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow =
            "var(--shadow-sm), var(--inset-shine)";
        }}
      >
        {/* Colored dot — top right corner */}
        <span
          className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: data.color }}
        />

        {/* Top row: emoji + name */}
        <div className="flex items-center gap-1.5 mb-0.5 pr-4">
          <span className="text-[16px] leading-none">{data.emoji}</span>
          <span className="font-semibold text-[13px] tracking-[-0.2px] truncate agent-name-glow" style={{ color: 'var(--text-primary)' }}>
            {data.name}
          </span>
        </div>

        {/* Bottom row: title */}
        <div className="text-[11px] leading-tight truncate" style={{ color: 'var(--text-secondary)' }}>
          {data.title}
        </div>

        {/* Cron pill */}
        {data.crons && data.crons.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--bg-fill-2)', color: 'var(--text-secondary)' }}
            >
              {data.crons.length} cron{data.crons.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "transparent", border: "none", width: 6, height: 6 }}
      />
    </>
  );
}

export const nodeTypes = { agentNode: AgentNode };
