import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Daily() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [ownLog, setOwnLog] = useState<any>(null);
  const [morning, setMorning] = useState("");
  const [evening, setEvening] = useState("");
  const [eveningFeed, setEveningFeed] = useState<any[]>([]);
  const [morningPublic, setMorningPublic] = useState(false);
  const [completePublic, setCompletePublic] = useState(false);

  useEffect(() => {
    document.title = "일일 기록 - TALKROOM";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!roomId || !user) return;
      setLoading(true);
      try {
        const { data: courseData, error: courseErr } = await supabase
          .from("training_courses")
          .select("id,total_days,start_date")
          .eq("talk_room_id", roomId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (courseErr) throw courseErr;
        if (!courseData) {
          navigate(`/training-course/${roomId}`, { replace: true });
          return;
        }
        setCourse(courseData);

        const now = new Date();
        const start = new Date(courseData.start_date as string);
        const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const currentDay = Math.max(1, Math.min(diffDays, courseData.total_days));

        const { data: log, error: logErr } = await supabase
          .from("daily_logs")
          .select("id,day_number,morning_promise,evening_review,log_date")
          .eq("talk_room_id", roomId)
          .eq("user_id", user.id)
          .eq("day_number", currentDay)
          .maybeSingle();
        if (logErr && logErr.code !== "PGRST116") throw logErr;
        setOwnLog(log);
        setMorning(log?.morning_promise || "");
        setEvening(log?.evening_review || "");

        const { data: feed, error: feedErr } = await supabase
          .rpc("get_evening_logs", { _room_id: roomId });
        if (feedErr) throw feedErr;
        setEveningFeed(feed || []);
      } catch (e: any) {
        console.error(e);
        toast({ title: "로드 실패", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [roomId, user, navigate, toast]);

  const progress = useMemo(() => {
    if (!course) return 0;
    const now = new Date();
    const start = new Date(course.start_date as string);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const currentDay = Math.max(1, Math.min(diffDays, course.total_days));
    return Math.round((currentDay / course.total_days) * 100);
  }, [course]);

  const currentDay = useMemo(() => {
    if (!course) return null as number | null;
    const now = new Date();
    const start = new Date(course.start_date as string);
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(diffDays, course.total_days));
  }, [course]);

  const isLastDay = useMemo(() => {
    if (!course || currentDay == null) return false;
    return currentDay === course.total_days;
  }, [course, currentDay]);

  const saveMorning = async () => {
    if (!roomId || !user || !course) return;
    try {
      const now = new Date();
      const start = new Date(course.start_date as string);
      const day = Math.max(1, Math.min(Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1, course.total_days));
      if (ownLog?.id) {
        const { error } = await supabase
          .from("daily_logs")
          .update({ morning_promise: morning })
          .eq("id", ownLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("daily_logs")
          .insert({ user_id: user.id, talk_room_id: roomId, day_number: day, morning_promise: morning });
        if (error) throw error;
      }
      // 공개 설정: 홈 피드 익명 공개/비공개 처리
      if (morningPublic) {
        const { error: postErr } = await supabase
          .from("feed_posts")
          .upsert(
            { user_id: user.id, talk_room_id: roomId, type: "daily_promise", content: morning, is_public: true },
            { onConflict: "user_id,talk_room_id,type" }
          );
        if (postErr) throw postErr;
      } else {
        await supabase
          .from("feed_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("talk_room_id", roomId)
          .eq("type", "daily_promise");
      }

      toast({ title: "아침 다짐 저장", description: "좋은 하루의 시작!" });
    } catch (e: any) {
      toast({ title: "저장 실패", description: e.message, variant: "destructive" });
    }
  };

  const saveEvening = async () => {
    if (!roomId || !user || !course) return;
    try {
      const now = new Date();
      const start = new Date(course.start_date as string);
      const day = Math.max(1, Math.min(Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1, course.total_days));
      if (ownLog?.id) {
        const { error } = await supabase
          .from("daily_logs")
          .update({ evening_review: evening })
          .eq("id", ownLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("daily_logs")
          .insert({ user_id: user.id, talk_room_id: roomId, day_number: day, evening_review: evening });
        if (error) throw error;
      }
      // 훈련 완료 후기 공개 처리 (마지막 날)
      if (day === course.total_days) {
        if (completePublic) {
          const { error: postErr } = await supabase
            .from("feed_posts")
            .upsert(
              { user_id: user.id, talk_room_id: roomId, type: "training_complete", content: evening, is_public: true },
              { onConflict: "user_id,talk_room_id,type" }
            );
          if (postErr) throw postErr;
        } else {
          await supabase
            .from("feed_posts")
            .delete()
            .eq("user_id", user.id)
            .eq("talk_room_id", roomId)
            .eq("type", "training_complete");
        }
      }

      toast({ title: "저녁 리뷰 저장", description: "오늘도 수고했어요." });
      const { data: feed } = await supabase.rpc("get_evening_logs", { _room_id: roomId });
      setEveningFeed(feed || []);
    } catch (e: any) {
      toast({ title: "저장 실패", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <main className="min-h-screen p-6">로딩 중...</main>;
  if (!course) return null;

  return (
    <main className="min-h-screen bg-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">일일 기록</h1>

        <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">진행률</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">
              시작일 {new Date(course.start_date as string).toLocaleDateString("ko-KR")} · 총 {course.total_days}일
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">아침 다짐 (본인만 조회)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea rows={4} value={morning} onChange={(e) => setMorning(e.target.value)} placeholder="오늘의 다짐을 적어주세요" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch id="morning-public" checked={morningPublic} onCheckedChange={setMorningPublic} />
                  <Label htmlFor="morning-public">홈 피드에 익명 공개</Label>
                </div>
                <Button onClick={saveMorning}>저장</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">저녁 훈련리뷰 (참가자들과 공유)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={4} value={evening} onChange={(e) => setEvening(e.target.value)} placeholder="오늘의 리뷰를 남겨주세요" />
              {isLastDay && (
                <div className="flex items-center gap-2">
                  <Switch id="complete-public" checked={completePublic} onCheckedChange={setCompletePublic} />
                  <Label htmlFor="complete-public">훈련 완료 후기로 공개</Label>
                </div>
              )}
              <Button onClick={saveEvening}>저장 및 공유</Button>
              <div className="space-y-2">
                {eveningFeed.length === 0 ? (
                  <div className="text-sm text-muted-foreground">아직 공유된 리뷰가 없습니다.</div>
                ) : (
                  eveningFeed.map((item, idx) => (
                    <div key={idx} className="p-3 border rounded-md">
                      <div className="text-xs text-muted-foreground">{item.day_number}일차 · {new Date(item.created_at).toLocaleString("ko-KR")}</div>
                      <div className="text-sm whitespace-pre-wrap">{item.evening_review}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        </section>
      </div>
    </main>
  );
}
