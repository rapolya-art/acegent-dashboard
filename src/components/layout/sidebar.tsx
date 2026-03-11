"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Phone,
  Bot,
  PhoneCall,
  BookOpen,
  Megaphone,
  Users,
  CreditCard,
  LifeBuoy,
  Settings,
  ChevronDown,
  LogOut,
  MessageSquare,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useOrganization } from "@/lib/hooks/use-organization";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Огляд", href: "/dashboard", icon: LayoutDashboard },
  { name: "Дзвінки", href: "/dashboard/calls", icon: Phone },
  { name: "Чати", href: "/dashboard/chats", icon: MessageSquare },
  { name: "Агенти", href: "/dashboard/agents", icon: Bot },
  { name: "Номери", href: "/dashboard/phone-numbers", icon: PhoneCall },
  { name: "База знань", href: "/dashboard/knowledge-base", icon: BookOpen },
  { name: "Кампанії", href: "/dashboard/campaigns", icon: Megaphone },
  { name: "Ліди", href: "/dashboard/leads", icon: Users },
  { name: "Біллінг", href: "/dashboard/billing", icon: CreditCard },
  { name: "Підтримка", href: "/dashboard/support", icon: LifeBuoy },
  { name: "Налаштування", href: "/dashboard/settings", icon: Settings },
];

const roleLabels: Record<string, string> = {
  owner: "Власник",
  admin: "Адмін",
  viewer: "Переглядач",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { organization, organizations, switchOrg } = useOrganization();
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("viewer");

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");

        if (organization) {
          const { data: member } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("organization_id", organization.id)
            .single();
          if (member) setUserRole(member.role);
        }
      }
    }
    fetchUser();
  }, [organization]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const orgName = organization?.name || "...";
  const orgInitial = orgName.charAt(0).toUpperCase();
  const userInitials = userName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <span className="font-mono text-lg font-bold tracking-tight text-white">
          ACEGENT
        </span>
      </div>

      {/* Org Switcher */}
      <div className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/20 text-xs font-bold text-brand">
                {orgInitial}
              </div>
              <span className="flex-1 truncate text-left text-sm">{orgName}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchOrg(org.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded bg-brand/20 text-[10px] font-bold text-brand flex-shrink-0">
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate">{org.name}</span>
                {org.id === organization?.id && (
                  <Check className="h-3.5 w-3.5 text-brand flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navigation.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
              )}
            >
              <item.icon
                className={cn("h-4 w-4", isActive && "text-brand")}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Menu */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-brand/20 text-xs text-brand">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">{userName || "..."}</p>
                <p className="text-xs text-muted-foreground">{roleLabels[userRole] || userRole}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Налаштування
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Вийти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
