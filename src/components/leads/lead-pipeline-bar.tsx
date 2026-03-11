"use client";

import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LEAD_STATUSES, leadStatusLabels } from "./lead-status-badge";

const statusBarColors: Record<LeadStatus, string> = {
  new: "bg-blue-500/30 hover:bg-blue-500/40",
  contacted: "bg-warning/30 hover:bg-warning/40",
  qualified: "bg-brand/30 hover:bg-brand/40",
  appointment: "bg-purple-500/30 hover:bg-purple-500/40",
  won: "bg-success/30 hover:bg-success/40",
  lost: "bg-danger/30 hover:bg-danger/40",
};

const statusTextColors: Record<LeadStatus, string> = {
  new: "text-blue-400",
  contacted: "text-warning",
  qualified: "text-brand",
  appointment: "text-purple-400",
  won: "text-success",
  lost: "text-danger",
};

interface LeadPipelineBarProps {
  counts: Record<LeadStatus, number>;
  activeStatus?: LeadStatus | null;
  onStatusClick: (status: LeadStatus | null) => void;
}

export function LeadPipelineBar({
  counts,
  activeStatus,
  onStatusClick,
}: LeadPipelineBarProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onStatusClick(null)}
        className={cn(
          "flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
          activeStatus === null || activeStatus === undefined
            ? "bg-white/10 text-white"
            : "bg-white/5 text-muted-foreground hover:bg-white/10"
        )}
      >
        Всі
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">
          {total}
        </span>
      </button>

      {LEAD_STATUSES.map((status) => (
        <button
          key={status}
          onClick={() =>
            onStatusClick(activeStatus === status ? null : status)
          }
          className={cn(
            "flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            activeStatus === status
              ? statusBarColors[status]
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          <span className={activeStatus === status ? statusTextColors[status] : ""}>
            {leadStatusLabels[status]}
          </span>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px]",
              activeStatus === status
                ? "bg-white/10"
                : "bg-white/5"
            )}
          >
            {counts[status]}
          </span>
        </button>
      ))}
    </div>
  );
}
