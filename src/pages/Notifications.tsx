import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Bell, MessageCircle, Info, AlarmClock, CheckCircle2 } from "lucide-react";

// Minimal, black & white styled notifications page
const typeMap = {
  all: { label: "전체", icon: Bell },
  chat: { label: "채팅", icon: MessageCircle },
  nudge: { label: "코스", icon: AlarmClock },
  system: { label: "시스템", icon: Info },
} as const;

export type NotificationType = "nudge" | "chat" | "system";

interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | NotificationType>("all");

  useEffect(() => {
    document.title = "알림 | TALKROOM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "읽지 않은 알림을 확인하고 관리하세요.");
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,user_id,type,title,message,is_read,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NotificationItem[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onError: (e: any) => toast("알림 처리 실패", { description: e.message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
      qc.invalidateQueries({ queryKey: ["notifications-unread", user?.id] });
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [] as NotificationItem[];
    if (filter === "all") return data;
    return data.filter((n) => n.type === filter);
  }, [data, filter]);

  return (
    <main className="min-h-screen bg-white pb-20">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <Bell className="h-5 w-5" />
          <h1 className="text-xl font-semibold">알림</h1>
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid grid-cols-4 w-full">
              {Object.entries(typeMap).map(([key, cfg]) => (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <cfg.icon className="h-4 w-4" />
                  {cfg.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-4 space-y-3">
        {isLoading && (
          <Card className="p-6 text-center text-muted-foreground">불러오는 중…</Card>
        )}
        {!isLoading && filtered.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-sm text-muted-foreground">표시할 알림이 없습니다.</p>
          </Card>
        )}

        {filtered.map((n) => (
          <article
            key={n.id}
            role="button"
            onClick={() => !n.is_read && markRead.mutate(n.id)}
            className={[
              "rounded-md border p-4 text-left transition-colors",
              n.is_read ? "bg-background" : "bg-muted/40",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {n.type === "nudge" && <AlarmClock className="h-5 w-5" />}
                {n.type === "chat" && <MessageCircle className="h-5 w-5" />}
                {n.type === "system" && <Info className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium leading-none">{n.title}</h2>
                  {!n.is_read ? (
                    <Badge variant="secondary" className="text-xs">NEW</Badge>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {n.message && (
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{n.message}</p>
                )}
                <Separator className="my-3" />
                <time className="text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </time>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
