"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Save, Users, Key, Calendar, Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/lib/hooks/use-organization";
import { useAgents } from "@/lib/hooks/use-agents";
import { useCalendarIntegrations } from "@/lib/hooks/use-calendar-integrations";

const roleLabels: Record<string, string> = {
  owner: "Власник",
  admin: "Адмін",
  viewer: "Переглядач",
};

const roleColors: Record<string, string> = {
  owner: "bg-brand/20 text-brand",
  admin: "bg-blue-500/20 text-blue-400",
  viewer: "bg-white/10 text-muted-foreground",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Завантаження...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { organization, members, loading } = useOrganization();
  const { agents } = useAgents(organization?.id);
  const {
    integrations,
    loading: intLoading,
    addIntegration,
    removeIntegration,
    startGoogleOAuth,
    refetch,
  } = useCalendarIntegrations(organization?.id);

  const searchParams = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [googleAgentDialog, setGoogleAgentDialog] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgTimezone, setOrgTimezone] = useState("Europe/Kyiv");
  const [orgSaving, setOrgSaving] = useState(false);

  // Init org form
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      setOrgTimezone(organization.timezone);
    }
  }, [organization]);

  // Handle Google OAuth callback query params
  useEffect(() => {
    const googleResult = searchParams.get("google");
    if (googleResult === "success") {
      setToast({ message: "Google Calendar підключено успішно!", type: "success" });
      refetch();
    } else if (googleResult === "error") {
      const msg = searchParams.get("error_message") || "Помилка підключення Google Calendar";
      setToast({ message: msg, type: "error" });
    }
  }, [searchParams, refetch]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Завантаження...</div>;
  }

  async function handleAddIntegration() {
    if (!apiKey.trim()) {
      setDialogError("Введіть API-ключ");
      return;
    }
    setSaving(true);
    setDialogError(null);
    const result = await addIntegration({
      apiKey: apiKey.trim(),
      agentId: selectedAgent === "all" ? null : selectedAgent,
    });
    setSaving(false);
    if (result.success) {
      setDialogOpen(false);
      setApiKey("");
      setSelectedAgent("all");
    } else {
      setDialogError(result.error || "Помилка");
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={searchParams.get("tab") || "org"} className="w-full">
        <TabsList className="glass">
          <TabsTrigger value="org">Організація</TabsTrigger>
          <TabsTrigger value="members">Учасники</TabsTrigger>
          <TabsTrigger value="api">API-ключі</TabsTrigger>
          <TabsTrigger value="notifications">Сповіщення</TabsTrigger>
          <TabsTrigger value="integrations">Інтеграції</TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="mt-4 space-y-4">
          <div className="glass rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Дані організації
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs">Назва</Label>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Slug</Label>
                <Input defaultValue={organization?.slug || ""} disabled />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Часовий пояс</Label>
                <Input value={orgTimezone} onChange={(e) => setOrgTimezone(e.target.value)} />
              </div>
            </div>
            <Button
              className="gap-2 bg-brand hover:bg-brand-dark"
              disabled={orgSaving}
              onClick={async () => {
                if (!organization) return;
                setOrgSaving(true);
                const supabase = (await import("@/lib/supabase/client")).createClient();
                const { error: err } = await supabase
                  .from("organizations")
                  .update({ name: orgName, timezone: orgTimezone })
                  .eq("id", organization.id);
                setOrgSaving(false);
                if (err) {
                  setToast({ message: err.message, type: "error" });
                } else {
                  setToast({ message: "Налаштування збережено!", type: "success" });
                }
              }}
            >
              <Save className="h-4 w-4" />
              {orgSaving ? "Збереження..." : "Зберегти"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-4">
          <div className="glass rounded-xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Учасники</h3>
              <Button size="sm" className="bg-brand hover:bg-brand-dark">
                <Users className="mr-2 h-4 w-4" />
                Запросити
              </Button>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Немає учасників.</p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                    <div>
                      <p className="text-sm font-medium text-white">{member.user_profiles?.full_name || "Користувач"}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <Badge variant="secondary" className={roleColors[member.role] || ""}>
                      {roleLabels[member.role] || member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="api" className="mt-4 space-y-4">
          <div className="glass rounded-xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">API-ключі</h3>
              <Button size="sm" className="bg-brand hover:bg-brand-dark">
                <Key className="mr-2 h-4 w-4" />
                Створити ключ
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              API-ключі дозволяють інтегрувати Acegent з вашими системами.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <div className="glass rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Сповіщення
            </h3>
            <div className="space-y-4">
              {[
                { label: "Негативні дзвінки", desc: "Email при виявленні негативного sentiment", enabled: true },
                { label: "Ліміт хвилин", desc: "Email при досягненні 80% ліміту", enabled: true },
                { label: "Помилки агента", desc: "Email при помилках під час дзвінка", enabled: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className={`h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer ${item.enabled ? "bg-brand" : "bg-white/10"}`}>
                    <div className={`h-4 w-4 rounded-full bg-white transition-transform ${item.enabled ? "translate-x-4" : ""}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 space-y-4">
          {toast && (
            <div
              className={`rounded-lg p-3 text-sm ${
                toast.type === "success"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {toast.message}
            </div>
          )}
          <div className="glass rounded-xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Календар</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 hover:bg-white/5"
                  onClick={() => {
                    setDialogOpen(true);
                    setDialogError(null);
                    setApiKey("");
                    setSelectedAgent("all");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Calendly
                </Button>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-dark"
                  onClick={() => {
                    setGoogleAgentDialog(true);
                    setSelectedAgent("all");
                  }}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google Calendar
                </Button>
              </div>
            </div>

            {intLoading ? (
              <p className="text-sm text-muted-foreground">Завантаження...</p>
            ) : integrations.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Немає підключених календарів.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Підключіть Calendly або Google Calendar щоб бот перевіряв реальну доступність.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between rounded-lg bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        integration.provider === "google" ? "bg-emerald-500/20" : "bg-blue-500/20"
                      }`}>
                        {integration.provider === "google" ? (
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        ) : (
                          <Calendar className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {integration.provider === "google" ? "Google Calendar" : "Calendly"}
                          {integration.connected_email && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {integration.connected_email}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {integration.agents
                            ? `Агент: ${(integration.agents as { name: string }).name}`
                            : "Всі агенти"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          integration.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }
                      >
                        {integration.status === "active" ? "Активна" : "Помилка"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                        onClick={() => removeIntegration(integration.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Google Calendar — agent selection dialog */}
      <Dialog open={googleAgentDialog} onOpenChange={setGoogleAgentDialog}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Google Calendar</DialogTitle>
            <DialogDescription>
              Оберіть агента для якого підключити Google Calendar. Після натискання &quot;Підключити&quot; вас буде перенаправлено на сторінку авторизації Google.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-1.5 block text-xs">Агент</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Всі агенти" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі агенти</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGoogleAgentDialog(false)}>
              Скасувати
            </Button>
            <Button
              className="bg-brand hover:bg-brand-dark"
              onClick={() => {
                startGoogleOAuth(selectedAgent === "all" ? null : selectedAgent);
              }}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Підключити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Calendly Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Підключити Calendly</DialogTitle>
            <DialogDescription>
              Введіть ваш Personal Access Token з Calendly.
              Його можна створити на{" "}
              <a
                href="https://calendly.com/integrations/api_webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand underline"
              >
                calendly.com/integrations
              </a>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block text-xs">API-ключ (Personal Access Token)</Label>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="eyJraWQ..."
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Агент</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Всі агенти" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі агенти</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dialogError && (
              <p className="text-sm text-red-400">{dialogError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Скасувати
            </Button>
            <Button
              className="bg-brand hover:bg-brand-dark"
              onClick={handleAddIntegration}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              Підключити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
