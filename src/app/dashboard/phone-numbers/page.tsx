"use client";

import { Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrganization } from "@/lib/hooks/use-organization";
import { usePhoneNumbers } from "@/lib/hooks/use-phone-numbers";

const statusLabels: Record<string, string> = {
  active: "Активний",
  inactive: "Неактивний",
};

const statusColors: Record<string, string> = {
  active: "bg-success/20 text-success",
  inactive: "bg-warning/20 text-warning",
};

export default function PhoneNumbersPage() {
  const { organization } = useOrganization();
  const { phoneNumbers, loading } = usePhoneNumbers(organization?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Управління телефонними номерами
        </p>
        <Button className="gap-2 bg-brand hover:bg-brand-dark">
          <Plus className="h-4 w-4" />
          Додати номер
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Завантаження...</div>
      ) : phoneNumbers.length === 0 ? (
        <EmptyState icon={Phone} title="Немає номерів" description="Додайте телефонний номер для вашого агента." />
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">Номер</th>
                <th className="px-4 py-3">Провайдер</th>
                <th className="px-4 py-3">Агент</th>
                <th className="px-4 py-3">Країна</th>
                <th className="px-4 py-3">Статус</th>
              </tr>
            </thead>
            <tbody>
              {phoneNumbers.map((pn) => (
                <tr key={pn.id} className="border-b border-border/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-brand" />
                      <span className="font-mono text-white">{pn.number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{pn.provider}</td>
                  <td className="px-4 py-3 text-white">{pn.agents?.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{pn.country}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={statusColors[pn.status] || ""}>
                      {statusLabels[pn.status] || pn.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
