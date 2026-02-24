"use client";

import { TrendingUp, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrganization } from "@/lib/hooks/use-organization";

const planLabels: Record<string, string> = {
  trial: "Trial",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

const planDescriptions: Record<string, string> = {
  trial: "Пробний період — обмежений функціонал",
  starter: "200 хвилин / місяць, 3 агенти, email-підтримка",
  pro: "1000 хвилин / місяць, необмежені агенти, пріоритетна підтримка",
  enterprise: "Кастомний план під ваші потреби",
};

export default function BillingPage() {
  const { organization, loading } = useOrganization();

  const plan = organization?.plan || "trial";
  const minutesUsed = organization?.minutes_used || 0;
  const minutesLimit = organization?.minutes_limit || 0;
  const usagePct = minutesLimit > 0 ? Math.round((minutesUsed / minutesLimit) * 100) : 0;

  if (loading) {
    return <div className="text-sm text-muted-foreground">Завантаження...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{planLabels[plan] || plan}</h3>
              <Badge variant="secondary" className="bg-brand/20 text-brand">
                Поточний план
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {planDescriptions[plan] || ""}
            </p>
          </div>
          <Button className="bg-brand hover:bg-brand-dark">
            <TrendingUp className="mr-2 h-4 w-4" />
            Оновити план
          </Button>
        </div>
      </div>

      {/* Usage Meter */}
      <div className="glass rounded-xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Використання хвилин
        </h3>
        <div className="mb-2 flex items-end justify-between">
          <span className="text-3xl font-bold text-white">{minutesUsed}</span>
          <span className="text-sm text-muted-foreground">/ {minutesLimit} хв</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${Math.min(usagePct, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {usagePct}% ліміту використано. Залишилось {Math.max(minutesLimit - minutesUsed, 0)} хвилин.
        </p>
      </div>

      {/* Cost Breakdown — empty state */}
      <div className="glass rounded-xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Розбивка витрат (цей місяць)
        </h3>
        <EmptyState icon={CreditCard} title="Немає даних" description="Витрати з'являться після першого дзвінка." />
      </div>

      {/* Invoices — empty state */}
      <div className="glass rounded-xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Рахунки</h3>
        <EmptyState icon={CreditCard} title="Немає рахунків" description="Рахунки з'являться тут після початку платного плану." />
      </div>
    </div>
  );
}
