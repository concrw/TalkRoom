import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function CreateRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<string>("");
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [price, setPrice] = useState<number>(0); // KRW
  const [capacity, setCapacity] = useState<number>(50);
  const [trainingWeeks, setTrainingWeeks] = useState<number>(3);
  const [startsAt, setStartsAt] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");

  useEffect(() => {
    document.title = "토크룸 생성 - TALKROOM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "새로운 토크룸을 만드세요.");
    const link: HTMLLinkElement = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", `${window.location.origin}/create-room`);
    if (!link.parentNode) document.head.appendChild(link);
  }, []);

  const onSubmit = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      toast({ title: "제목 필요", description: "제목을 입력하세요.", variant: "destructive" });
      return;
    }
    try {
      const kw = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const priceCents = Math.max(0, Math.round(Number(price) * 100));
      const { data, error } = await supabase
        .from("talk_rooms")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          media_type: mediaType || null,
          media_url: mediaUrl || null,
          price_cents: priceCents,
          price_currency: "KRW",
          capacity,
          training_weeks: trainingWeeks,
          keywords: kw,
          starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
          host_id: user.id,
          is_public: true,
          replay_available: false,
        })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      toast({ title: "생성 완료", description: "토크룸이 생성되었습니다." });
      navigate(`/rooms/${data?.id}`);
    } catch (e: any) {
      toast({ title: "생성 실패", description: e.message, variant: "destructive" });
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">토크룸 생성</h1>
        <p className="text-sm text-muted-foreground">제목과 기본 정보를 입력하세요.</p>
      </header>

      <Card className="p-4 space-y-3 max-w-2xl">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input value={mediaType} onChange={(e) => setMediaType(e.target.value)} placeholder="미디어 타입 (video/audio 등)" />
          <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="미디어 URL" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="참가비 (KRW)" />
          <Input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} placeholder="최대 인원" />
          <Input type="number" value={trainingWeeks} onChange={(e) => setTrainingWeeks(Number(e.target.value))} placeholder="훈련 주차" />
          <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} placeholder="시작 일시" />
        </div>
        <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="키워드 (쉼표로 구분)" />
        <div className="flex gap-2">
          <Button onClick={onSubmit}>생성</Button>
        </div>
      </Card>
    </main>
  );
}
