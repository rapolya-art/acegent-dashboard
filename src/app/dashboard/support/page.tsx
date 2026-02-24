"use client";

import { Plus, MessageSquare, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useTickets } from "@/lib/hooks/use-support";

const statusColors: Record<string, string> = {
  open: "bg-warning/20 text-warning",
  in_progress: "bg-brand/20 text-brand",
  resolved: "bg-success/20 text-success",
  closed: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  open: "Відкритий",
  in_progress: "В роботі",
  resolved: "Вирішено",
  closed: "Закритий",
};

export default function SupportPage() {
  const { organization } = useOrganization();
  const { tickets, loading } = useTickets(organization?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Зверніться до нас з будь-яким питанням
        </p>
        <Button className="gap-2 bg-brand hover:bg-brand-dark">
          <Plus className="h-4 w-4" />
          Новий тікет
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Завантаження...</div>
      ) : tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="Немає тікетів" description="Створіть тікет, якщо маєте питання або проблему." />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="glass flex items-center justify-between rounded-xl p-4 transition-all hover:border-brand/20 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                  <MessageSquare className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">
                    {ticket.subject}
                  </h4>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(ticket.created_at).toLocaleDateString("uk-UA")}</span>
                    <span>{ticket.priority}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className={statusColors[ticket.status] || ""}>
                  {statusLabels[ticket.status] || ticket.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
