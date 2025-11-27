import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoomCard } from "@/components/RoomCard";

const currency = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" });

export default function TalkRoomsList() {
  useEffect(() => {
    document.title = "토크룸 목록 - TALKROOM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "공개 토크룸을 둘러보세요.");
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["talk_rooms", "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talk_rooms")
        .select("id, title, media_type, media_url, keywords, starts_at, capacity, price_cents, price_currency")
        .eq("is_public", true)
        .order("starts_at", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <main className="min-h-screen p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">토크룸 목록</h1>
        <p className="text-muted-foreground">공개 토크룸을 둘러보세요.</p>
      </header>

      {isLoading && <p className="text-muted-foreground">불러오는 중...</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((room) => (
          <RoomCard
            key={room.id}
            id={room.id}
            title={room.title}
            keywords={(room.keywords || []).slice(0, 4)}
            starts_at={room.starts_at as string}
            capacity={room.capacity as number}
            price_cents={room.price_cents as number}
            media_type={room.media_type as string}
            avatars={[]}
            live={new Date(room.starts_at as string) <= new Date()}
            to={`/rooms/${room.id}`}
          />
        ))}
      </section>
    </main>
  );
}
