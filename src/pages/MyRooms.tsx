import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoomCard } from "@/components/RoomCard";
import { Card } from "@/components/ui/card";

export default function MyRooms() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "나의 토크룸 - TALKROOM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "참가 중/호스팅 중인 토크룸을 관리합니다.");
  }, []);

  const { data: hosting } = useQuery({
    queryKey: ["myrooms-hosting", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talk_rooms")
        .select("id, title, media_type, media_url, keywords, starts_at, capacity, price_cents, price_currency")
        .eq("host_id", user!.id)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: joining } = useQuery({
    queryKey: ["myrooms-joining", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: parts, error: e1 } = await supabase
        .from("room_participants")
        .select("room_id")
        .eq("user_id", user!.id);
      if (e1) throw e1;
      const ids = (parts || []).map((p: any) => p.room_id);
      if (ids.length === 0) return [] as any[];
      const { data: rooms, error: e2 } = await supabase
        .from("talk_rooms")
        .select("id, title, media_type, media_url, keywords, starts_at, capacity, price_cents, price_currency")
        .in("id", ids)
        .order("starts_at", { ascending: true });
      if (e2) throw e2;
      return rooms || [];
    },
  });

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-6">나의 토크룸</h1>

      <section className="space-y-3 mb-8">
        <h2 className="text-xl font-semibold">참가 중</h2>
        {!joining || joining.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">참가 중인 토크룸이 없습니다.</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {joining.map((r: any) => (
              <RoomCard
                key={r.id}
                id={r.id}
                title={r.title}
                keywords={(r.keywords || []).slice(0,4)}
                starts_at={r.starts_at as string}
                capacity={r.capacity as number}
                price_cents={r.price_cents as number}
                media_type={r.media_type as string}
                avatars={[]}
                live={new Date(r.starts_at as string) <= new Date()}
                to={`/rooms/${r.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">내가 만든 방</h2>
        {!hosting || hosting.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">호스팅 중인 토크룸이 없습니다.</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hosting.map((r: any) => (
              <RoomCard
                key={r.id}
                id={r.id}
                title={r.title}
                keywords={(r.keywords || []).slice(0,4)}
                starts_at={r.starts_at as string}
                capacity={r.capacity as number}
                price_cents={r.price_cents as number}
                media_type={r.media_type as string}
                avatars={[]}
                live={new Date(r.starts_at as string) <= new Date()}
                to={`/rooms/${r.id}`}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

