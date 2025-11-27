import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Participant {
  user_id: string;
  status: string;
  joined_at: string;
}

export default function EditRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<string>("");
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [price, setPrice] = useState<number>(0); // KRW
  const [capacity, setCapacity] = useState<number>(50);
  const [trainingWeeks, setTrainingWeeks] = useState<number>(3);
  const [startsAt, setStartsAt] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "토크룸 수정 - TALKROOM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "토크룸 정보를 수정하세요.");
    const link: HTMLLinkElement = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", `${window.location.origin}/edit-room/${id}`);
    if (!link.parentNode) document.head.appendChild(link);
  }, [id]);

  useEffect(() => {
    const load = async () => {
      if (!id || !user?.id) return;
      const { data: room, error } = await supabase
        .from("talk_rooms")
        .select("host_id,title,description,media_type,media_url,price_cents,price_currency,capacity,training_weeks,keywords,starts_at")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        toast({ title: "오류", description: error.message, variant: "destructive" });
        return;
      }
      if (!room) {
        toast({ title: "없음", description: "토크룸을 찾을 수 없습니다.", variant: "destructive" });
        navigate("/");
        return;
      }
      const host = room.host_id === user.id;
      setIsHost(host);
      if (!host) {
        toast({ title: "권한 없음", description: "방장만 수정할 수 있습니다.", variant: "destructive" });
        navigate(`/rooms/${id}`);
        return;
      }
      setTitle(room.title || "");
      setDescription(room.description || "");
      setMediaType(room.media_type || "");
      setMediaUrl(room.media_url || "");
      setPrice(Number(room.price_cents || 0) / 100);
      setCapacity(room.capacity || 50);
      setTrainingWeeks(room.training_weeks || 3);
      setKeywords((room.keywords || []).join(", "));
      setStartsAt(room.starts_at ? new Date(room.starts_at).toISOString().slice(0, 16) : "");

      const { data: parts } = await supabase
        .from("room_participants")
        .select("user_id,status,joined_at")
        .eq("room_id", id)
        .order("joined_at", { ascending: true });
      setParticipants(parts || []);
      const ids = Array.from(new Set((parts || []).map((p) => p.user_id)));
      if (ids.length) {
        const results = await Promise.all(ids.map(async (id) => {
          const { data } = await supabase.rpc("get_public_user_profile", { _id: id }).maybeSingle();
          return data;
        }));
        const map: Record<string, string> = {};
        results.filter(Boolean).forEach((u: any) => (map[u.id] = (u.name as string) || `사용자-${u.id.slice(0, 6)}`));
        setNames(map);
      }

      setLoading(false);
    };
    load();
  }, [id, user?.id]);

  const onSave = async () => {
    if (!id || !user?.id) return;
    try {
      const kw = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const priceCents = Math.max(0, Math.round(Number(price) * 100));
      const { error } = await supabase
        .from("talk_rooms")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          media_type: mediaType || null,
          media_url: mediaUrl || null,
          price_cents: priceCents,
          capacity,
          training_weeks: trainingWeeks,
          keywords: kw,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        })
        .eq("id", id)
        .eq("host_id", user.id);
      if (error) throw error;
      toast({ title: "저장 완료", description: "변경 사항이 저장되었습니다." });
    } catch (e: any) {
      toast({ title: "저장 실패", description: e.message, variant: "destructive" });
    }
  };

  const onKick = async (uid: string) => {
    if (!id) return;
    if (!confirm("해당 참가자를 퇴장시키겠습니까?")) return;
    try {
      const { error } = await supabase
        .from("room_participants")
        .delete()
        .eq("room_id", id)
        .eq("user_id", uid);
      if (error) throw error;
      setParticipants((prev) => prev.filter((p) => p.user_id !== uid));
      toast({ title: "처리 완료", description: "참가자를 퇴장시켰습니다." });
    } catch (e: any) {
      toast({ title: "실패", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <main className="min-h-screen p-6 flex items-center justify-center text-muted-foreground">불러오는 중…</main>;
  }

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">토크룸 수정</h1>
          <p className="text-sm text-muted-foreground">방 정보와 참가자를 관리하세요.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/rooms/${id}`)}>방 보기</Button>
          <Button onClick={onSave}>저장</Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <Card className="p-4 space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input value={mediaType} onChange={(e) => setMediaType(e.target.value)} placeholder="미디어 타입" />
            <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="미디어 URL" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="참가비 (KRW)" />
            <Input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} placeholder="최대 인원" />
            <Input type="number" value={trainingWeeks} onChange={(e) => setTrainingWeeks(Number(e.target.value))} placeholder="훈련 주차" />
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} placeholder="시작 일시" />
          </div>
          <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="키워드 (쉼표로 구분)" />
        </Card>

        <Card className="p-4">
          <h2 className="font-medium mb-2">참가자 관리</h2>
          <ScrollArea className="h-[50vh]">
            <div className="space-y-2 pr-2">
              {participants.map((p) => (
                <div key={p.user_id} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback>{(names[p.user_id] || '').slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{names[p.user_id] || `사용자-${p.user_id.slice(0,6)}`}</div>
                      <div className="text-xs text-muted-foreground">{p.status}</div>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => onKick(p.user_id)}>퇴장</Button>
                </div>
              ))}
              {participants.length === 0 && (
                <div className="text-sm text-muted-foreground">참가자가 없습니다.</div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </main>
  );
}
