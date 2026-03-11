"use client";

import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/lib/types";

const statusColors: Record<LeadStatus, string> = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-warning/20 text-warning",
  qualified: "bg-brand/20 text-brand",
  appointment: "bg-purple-500/20 text-purple-400",
  won: "bg-success/20 text-success",
  lost: "bg-danger/20 text-danger",
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "Новий",
  contacted: "Зв'язались",
  qualified: "Кваліфіковано",
  appointment: "Зустріч",
  won: "Виграно",
  lost: "Втрачено",
};

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "appointment",
  "won",
  "lost",
];

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="secondary" className={statusColors[status]}>
      {leadStatusLabels[status]}
    </Badge>
  );
}
