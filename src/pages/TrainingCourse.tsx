import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Types for our course data shape
type DayPlan = { day: number; text: string };
type CourseData = { days: DayPlan[] };

type TemplateKey = "habit" | "morning" | "self" | "health" | "mind";

const TEMPLATES: Record<TemplateKey, (keywords: string[], totalDays: number) => CourseData> = {
  habit: (keywords, totalDays) => ({
    days: Array.from({ length: totalDays }, (_, i) => ({
      day: i + 1,
      text: `${i + 1}일차: ${keywords[0] || "습관"} 20분 / ${keywords[1] || "운동"} 10분 / ${keywords[2] || "명상"} 5분`,
    })),
  }),
  morning: (keywords, totalDays) => ({
    days: Array.from({ length: totalDays }, (_, i) => ({
      day: i + 1,
      text: `${i + 1}일차: 기상·정리 / 가벼운 ${keywords[1] || "운동"} / 오늘 계획 3가지`,
    })),
  }),
  self: (keywords, totalDays) => ({
    days: Array.from({ length: totalDays }, (_, i) => ({
      day: i + 1,
      text: `${i + 1}일차: ${keywords[0] || "학습"} 30분 / 독서 15분 / 일일 성찰`,
    })),
  }),
  health: (keywords, totalDays) => ({
    days: Array.from({ length: totalDays }, (_, i) => ({
      day: i + 1,
      text: `${i + 1}일차: ${keywords[1] || "운동"} 20분 / 식단 기록 / 수면 7시간`,
    })),
  }),
  mind: (keywords, totalDays) => ({
    days: Array.from({ length: totalDays }, (_, i) => ({
      day: i + 1,
      text: `${i + 1}일차: 명상 5분 / 감사 3가지 / 짧은 일기`,
    })),
  }),
};

export default function TrainingCourse() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [course, setCourse] = useState<CourseData>({ days: [] });
  const [weeks, setWeeks] = useState<number>(3);
  const [template, setTemplate] = useState<TemplateKey>("habit");

  useEffect(() => {
    document.title = "훈련 코스 설계 - TALKROOM";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!roomId || !user) return;
      setLoading(true);
      try {
        const [roomRes, partRes, courseRes] = await Promise.all([
          supabase.from("talk_rooms").select("id,title,keywords,training_weeks").eq("id", roomId).maybeSingle(),
          supabase
            .from("room_participants")
            .select("id,review_completed")
            .eq("room_id", roomId)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("training_courses")
            .select("id,course_data,total_days,start_date")
            .eq("talk_room_id", roomId)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (roomRes.error) throw roomRes.error;
        setRoom(roomRes.data);
        const roomWeeks = roomRes.data?.training_weeks || 3;
        setWeeks(roomWeeks);

        if (partRes.error || !partRes.data?.review_completed) {
          navigate(`/review/${roomId}`, { replace: true });
          return;
        }
        setParticipant(partRes.data);

        if (!courseRes.error && courseRes.data) {
          setCourse(courseRes.data.course_data as CourseData);
          setWeeks(courseRes.data.total_days / 7);
        } else {
          // generate default from template
          const total = roomWeeks * 7;
          const keywords: string[] = roomRes.data?.keywords || [];
          const generated = TEMPLATES[template](keywords, total);
          setCourse(generated);
        }
      } catch (e: any) {
        console.error(e);
        toast({ title: "로드 실패", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user]);

  const totalDays = useMemo(() => weeks * 7, [weeks]);

  useEffect(() => {
    if (!room) return;
    // Regenerate when template changes and there's no existing course id
    if (course.days.length === 0) {
      const keywords: string[] = room?.keywords || [];
      setCourse(TEMPLATES[template](keywords, totalDays));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, totalDays, room]);

  const handleDayChange = (idx: number, value: string) => {
    setCourse((prev) => {
      const next = [...prev.days];
      if (!next[idx]) next[idx] = { day: idx + 1, text: "" };
      next[idx] = { ...next[idx], text: value };
      return { days: next };
    });
  };

  const handleSave = async () => {
    if (!roomId || !user) return;
    try {
      const payload = {
        user_id: user.id,
        talk_room_id: roomId,
        course_data: course,
        total_days: totalDays,
        start_date: new Date().toISOString().slice(0, 10), // D0 today
      } as const;
      const { error } = await supabase
        .from("training_courses")
        .upsert(payload, { onConflict: "user_id,talk_room_id" });
      if (error) throw error;
      toast({ title: "코스 저장", description: "일일 기록을 시작할 수 있어요." });
      navigate(`/daily/${roomId}`);
    } catch (e: any) {
      toast({ title: "저장 실패", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <main className="min-h-screen p-6">로딩 중...</main>;

  return (
    <main className="min-h-screen bg-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">훈련 코스 설계</h1>
        <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{room?.title || "토크룸"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">선택 템플릿</div>
                <Select value={template} onValueChange={(v) => setTemplate(v as TemplateKey)}>
                  <SelectTrigger><SelectValue placeholder="템플릿 선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="habit">습관형성</SelectItem>
                    <SelectItem value="morning">아침루틴</SelectItem>
                    <SelectItem value="self">자기계발</SelectItem>
                    <SelectItem value="health">건강관리</SelectItem>
                    <SelectItem value="mind">마음챙김</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">훈련 기간(주)</div>
                <Select value={String(weeks)} onValueChange={(v) => setWeeks(parseInt(v, 10))}>
                  <SelectTrigger><SelectValue placeholder="주차" /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,5,9].map((w) => (
                      <SelectItem key={w} value={String(w)}>{w}주</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={handleSave}>코스 저장 및 시작</Button>
              </div>
            </div>

            <div className="grid gap-3 mt-2">
              {Array.from({ length: totalDays }, (_, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-sm font-medium">{i + 1}일차</div>
                  <Textarea
                    rows={2}
                    value={course.days[i]?.text || ""}
                    onChange={(e) => handleDayChange(i, e.target.value)}
                    placeholder={`${i + 1}일 계획을 입력하세요`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </section>
      </div>
    </main>
  );
}
