import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const currency = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" });

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const roomId = id as string;

  useEffect(() => {
    if (room?.data) {
      const title = `${room.data.title} - TALKROOM`;
      document.title = title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", `${room.data.title} 토크룸 상세 정보와 참여 안내.`);
    }
  }, []);

  const room = useQuery({
    queryKey: ["talk_room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talk_rooms")
        .select("id, title, description, media_url, media_type, keywords, replay_available, starts_at, capacity, price_cents, price_currency, host_id, training_weeks")
        .eq("id", roomId)
        .maybeSingle();
      if (error) throw error;
      return data!;
    },
    enabled: !!roomId,
  });

  const participantsCount = useQuery({
    queryKey: ["participants_count", roomId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("room_participants")
        .select("id", { count: "exact", head: true })
        .eq("room_id", roomId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!roomId,
  });

  const host = useQuery({
    queryKey: ["host_profile", roomId, room.data?.host_id],
    queryFn: async () => {
      const hostId = room.data!.host_id as string;
      const [{ data: profile, error: e1 }, { count, error: e2 }] = await Promise.all([
        supabase.rpc("get_public_user_profile", { _id: hostId }).maybeSingle(),
        supabase.from("talk_rooms").select("id", { count: "exact", head: true }).eq("host_id", hostId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { profile, roomsCount: count || 0 };
    },
    enabled: !!room.data?.host_id,
  });

  const favorite = useQuery({
    queryKey: ["favorite", roomId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("room_favorites")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId && !!user,
  });

  const isFull = useMemo(() => {
    if (!room.data) return false;
    return (participantsCount.data || 0) >= (room.data.capacity || 0);
  }, [participantsCount.data, room.data]);

  const isHost = user?.id === room.data?.host_id;

  const handleToggleFavorite = async () => {
    if (!session) {
      navigate("/auth", { replace: false, state: { from: location.pathname } });
      return;
    }
    try {
      if (favorite.data?.id) {
        const { error } = await supabase.from("room_favorites").delete().eq("id", favorite.data.id);
        if (error) throw error;
        toast({ title: "관심목록에서 제거", description: "해당 토크룸이 관심목록에서 제거되었습니다." });
        favorite.refetch();
      } else {
        const { error } = await supabase.from("room_favorites").insert({ user_id: user!.id, room_id: roomId });
        if (error) throw error;
        toast({ title: "관심목록에 추가", description: "해당 토크룸이 관심목록에 추가되었습니다." });
        favorite.refetch();
      }
    } catch (e: any) {
      toast({ title: "처리 실패", description: e.message, variant: "destructive" });
    }
  };

  const handleJoin = () => {
    if (!session) {
      navigate("/auth", { replace: false, state: { from: location.pathname } });
      return;
    }
    navigate("/payment", { state: { roomId, title: room.data?.title } });
  };

  if (room.isLoading) return <main className="min-h-screen p-6">불러오는 중...</main>;
  if (room.isError || !room.data) return <main className="min-h-screen p-6">토크룸을 찾을 수 없습니다.</main>;

  return (
    <main className="min-h-screen p-6">
      <article className="max-w-5xl mx-auto">
        <header className="mb-4">
          <h1 className="text-3xl font-semibold">{room.data.title}</h1>
          <p className="text-muted-foreground">{new Date(room.data.starts_at as string).toLocaleString("ko-KR")}</p>
        </header>

        <section className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-3">
            <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground border rounded-md">
              {/* 강조된 미디어 영역 (회색 플레이스홀더) */}
              {room.data.media_type ? room.data.media_type.toUpperCase() : "MEDIA"}
            </div>
            <Card className="mt-4">
              <CardContent className="p-4 space-y-3">
                <h2 className="text-xl font-medium">토크룸 정보</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{room.data.description}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(room.data.keywords || []).map((k: string) => (
                    <Badge key={k} className="bg-foreground text-background">#{k}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="md:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">참가비</span>
                  <span className="text-lg font-semibold">{currency.format((room.data.price_cents as number) / 100)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">정원</span>
                  <span>{participantsCount.data || 0} / {room.data.capacity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">다시듣기</span>
                  <span>{room.data.replay_available ? "가능" : "불가"}</span>
                </div>
                <div className="pt-2 flex gap-2">
                  {isHost && (
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground">훈련 기간(주)</span>
                      <Select
                        defaultValue={String((room.data.training_weeks as number) || 3)}
                        onValueChange={async (value) => {
                          try {
                            const weeks = parseInt(value, 10);
                            const { error } = await supabase
                              .from("talk_rooms")
                              .update({ training_weeks: weeks })
                              .eq("id", roomId);
                            if (error) throw error;
                            toast({ title: "훈련 기간 저장", description: `${weeks}주로 설정되었습니다.` });
                            room.refetch();
                          } catch (e: any) {
                            toast({ title: "저장 실패", description: e.message, variant: "destructive" });
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="훈련 기간 선택" /></SelectTrigger>
                        <SelectContent>
                          {[1,2,3,5,9].map((w) => (
                            <SelectItem key={w} value={String(w)}>{w}주</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button variant="secondary" className="flex-1" onClick={handleToggleFavorite}>
                    {favorite.data?.id ? "관심 해제" : "관심목록 추가"}
                  </Button>
                  <Button className="flex-1" disabled={isFull} onClick={handleJoin}>
                    {isFull ? "정원 마감" : "참여하기"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-base font-medium">방장 프로필</h3>
                <Separator />
                {host.isLoading ? (
                  <p className="text-sm text-muted-foreground">불러오는 중...</p>
                ) : host.data?.profile ? (
                  <div className="space-y-1">
                    <div className="font-medium">{host.data.profile.name || "방장"}</div>
                    <div className="text-sm text-muted-foreground">평점 {host.data.profile.rating?.toFixed(1) ?? "-"} / 개설 {host.data.roomsCount}개</div>
                    {host.data.profile.bio && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{host.data.profile.bio}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">프로필 정보를 불러올 수 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </article>
    </main>
  );
}
