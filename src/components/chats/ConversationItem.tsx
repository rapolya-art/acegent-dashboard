"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Conversation {
  id: number;
  channel: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  contacts: {
    id: number;
    name: string;
    username: string | null;
    telegram_id: number | null;
  } | null;
  _lastMessage?: string;
}

interface Props {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "щойно";
  if (m < 60) return `${m}хв`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}год`;
  return `${Math.floor(h / 24)}д`;
}

const CHANNEL_LABEL: Record<string, string> = {
  telegram: "TG",
  whatsapp: "WA",
  instagram: "IG",
  email: "✉",
};

export function ConversationItem({ conversation, active, onClick }: Props) {
  const contact = conversation.contacts;
  const name = contact?.name ?? "Невідомий";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-muted/50 transition-colors border-b border-border/50",
        active && "bg-muted"
      )}
    >
      <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5">
        <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium text-sm truncate">{name}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {timeAgo(conversation.last_message_at)}
          </span>
        </div>

        {contact?.username && (
          <p className="text-xs text-muted-foreground truncate">@{contact.username}</p>
        )}

        <div className="flex items-center gap-1 mt-1">
          <Badge variant="outline" className="text-xs px-1 py-0 h-4">
            {CHANNEL_LABEL[conversation.channel] ?? conversation.channel}
          </Badge>
        </div>
      </div>
    </button>
  );
}
