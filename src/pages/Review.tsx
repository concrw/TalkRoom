import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const canEnter = !!participant?.review_completed;

  useEffect(() => {
    document.title = "리뷰 작성 - TALKROOM";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;
      setLoading(true);
      try {
        const [roomRes, participantRes, reviewRes] = await Promise.all([
          supabase
            .from("talk_rooms")
            .select("id,title,media_type,media_url,starts_at")
            .eq("id", id)
            .maybeSingle(),
          supabase
            .from("room_participants")
            .select("id,review_completed,status")
            .eq("room_id", id)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("reviews")
            .select("id,content,created_at,updated_at")
            .eq("talk_room_id", id)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (roomRes.error) throw roomRes.error;
        setRoom(roomRes.data);
        if (participantRes.error) {
          // Not a participant
          setParticipant(null);
        } else {
          setParticipant(participantRes.data);
        }
        if (reviewRes.error) {
          setReview(null);
          setContent("");
        } else {
          setReview(reviewRes.data);
          setContent(reviewRes.data?.content ?? "");
        }
      } catch (err: any) {
        console.error(err);
        toast({ title: "데이터 로드 실패", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleSave = async () => {
    if (!id || !user) return;
    try {
      if (!content.trim()) {
        toast({ title: "내용을 입력해주세요.", description: "한 글자 이상 작성해야 합니다.", variant: "destructive" });
        return;
      }
      const payload = { user_id: user.id, talk_room_id: id, content } as const;
      const { error: upsertError } = await supabase
        .from("reviews")
        .upsert(payload, { onConflict: "user_id,talk_room_id" });
      if (upsertError) throw upsertError;

      // Mark review as completed for this participant
      if (!participant?.review_completed) {
        const { error: updateError } = await supabase
          .from("room_participants")
          .update({ review_completed: true })
          .eq("room_id", id)
          .eq("user_id", user.id);
        if (updateError) throw updateError;
        setParticipant((prev: any) => ({ ...prev, review_completed: true }));
      }
      // 공개 설정 반영: 홈 피드에 익명 공개/비공개
      if (isPublic) {
        const { error: postErr } = await supabase
          .from("feed_posts")
          .upsert(
            { user_id: user.id, talk_room_id: id, type: "review", content, is_public: true },
            { onConflict: "user_id,talk_room_id,type" }
          );
        if (postErr) throw postErr;
      } else {
        // 비공개 선택 시 기존 공개글 삭제
        await supabase
          .from("feed_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("talk_room_id", id)
          .eq("type", "review");
      }

      toast({ title: "리뷰가 저장되었습니다.", description: "이제 토크룸에 입장할 수 있어요." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "리뷰 저장 실패", description: err.message, variant: "destructive" });
    }
  };

  const handleEnter = () => {
    if (!id) return;
    navigate(`/rooms/${id}/join`);
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold mb-2">리뷰 작성</h1>
        <p className="text-muted-foreground">로딩 중...</p>
      </main>
    );
  }

  if (!participant) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold mb-2">리뷰 작성</h1>
        <p className="text-muted-foreground">토크룸 참가자만 작성 가능합니다.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">리뷰 작성</h1>

        <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{room?.title ?? "토크룸"}</CardTitle>
            <CardDescription>
              {room?.media_type ? room.media_type.toUpperCase() : "미디어"}
              {room?.media_url ? ` · ${room.media_url}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="text-sm font-medium">리뷰</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="참여하신 토크룸에 대한 생각을 자유롭게 남겨주세요."
              />
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Switch id="review-public" checked={isPublic} onCheckedChange={setIsPublic} />
                  <Label htmlFor="review-public">홈 피드에 익명으로 공개</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSave}>리뷰 저장</Button>
                <Button variant={canEnter ? "default" : "secondary"} disabled={!canEnter} onClick={handleEnter}>
                  토크룸 입장
                </Button>
              </div>
              {!canEnter && (
                <p className="text-sm text-muted-foreground">리뷰 작성 완료 후에만 토크룸에 입장할 수 있습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>
        </section>
      </div>
    </main>
  );
}
