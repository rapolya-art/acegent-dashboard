"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Огляд",
  "/dashboard/calls": "Дзвінки",
  "/dashboard/agents": "Агенти",
  "/dashboard/phone-numbers": "Телефонні номери",
  "/dashboard/knowledge-base": "База знань",
  "/dashboard/billing": "Біллінг",
  "/dashboard/support": "Підтримка",
  "/dashboard/settings": "Налаштування",
};

export function Header() {
  const pathname = usePathname();

  const title =
    Object.entries(pageTitles).find(([path]) =>
      pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
    )?.[1] ?? "Дашборд";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      <h1 className="text-lg font-bold text-white">{title}</h1>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
