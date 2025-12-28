import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Target, CheckCircle, Circle, Flame, Trophy,
  Calendar, ChevronLeft, ChevronRight, Loader2,
  Sun, Moon, Star, TrendingUp
} from "lucide-react";

interface DailyLog {
  id: string;
  log_date: string;
  morning_promise: string | null;
  evening_review: string | null;
  day_number: number;
  talk_room_id: string;
}

interface MissionStats {
  totalDays: number;
  completedDays: number;
  currentStreak: number;
  bestStreak: number;
  weeklyRate: number;
}

export default function DailyMissions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'today' | 'calendar'>('today');

  useEffect(() => {
    document.title = "일일 미션 - TALKROOM";
  }, []);

  // 오늘 날짜 문자열
  const todayStr = new Date().toISOString().split('T')[0];
  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  // 사용자 통계 조회
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["mission-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("daily_logs")
        .select("log_date, morning_promise, evening_review")
        .eq("user_id", user!.id)
        .order("log_date", { ascending: false });

      if (error) throw error;

      const totalDays = logs?.length || 0;
      const completedDays = logs?.filter(l => l.evening_review).length || 0;

      // 연속 달성일 계산
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;
      const today = new Date();

      const sortedLogs = [...(logs || [])].sort((a, b) =>
        new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
      );

      for (let i = 0; i < sortedLogs.length; i++) {
        const log = sortedLogs[i];
        const logDate = new Date(log.log_date);
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);

        if (logDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0] && log.evening_review) {
          tempStreak++;
          if (i === sortedLogs.length - 1 || tempStreak > bestStreak) {
            bestStreak = Math.max(bestStreak, tempStreak);
          }
        } else {
          if (i === 0) currentStreak = 0;
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 0;
        }
        if (i === 0) currentStreak = tempStreak;
      }
      currentStreak = tempStreak;
      bestStreak = Math.max(bestStreak, tempStreak);

      // 주간 완료율
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const weeklyLogs = logs?.filter(l => l.log_date >= weekAgo) || [];
      const weeklyCompleted = weeklyLogs.filter(l => l.evening_review).length;
      const weeklyRate = weeklyLogs.length > 0 ? Math.round((weeklyCompleted / 7) * 100) : 0;

      // DB에서 streak_days 가져오기
      const { data: userData } = await supabase
        .from("users")
        .select("streak_days")
        .eq("id", user!.id)
        .single();

      return {
        totalDays,
        completedDays,
        currentStreak: userData?.streak_days || currentStreak,
        bestStreak: Math.max(bestStreak, userData?.streak_days || 0),
        weeklyRate
      } as MissionStats;
    }
  });

  // 선택된 날짜의 로그 조회
  const { data: selectedLog, isLoading: isLoadingLog, refetch: refetchLog } = useQuery({
    queryKey: ["daily-log", user?.id, selectedDateStr],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("log_date", selectedDateStr)
        .maybeSingle();

      if (error) throw error;
      return data as DailyLog | null;
    }
  });

  // 이번 달 로그 조회 (캘린더용)
  const { data: monthLogs } = useQuery({
    queryKey: ["month-logs", user?.id, selectedDate.getFullYear(), selectedDate.getMonth()],
    enabled: !!user?.id,
    queryFn: async () => {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from("daily_logs")
        .select("log_date, morning_promise, evening_review")
        .eq("user_id", user!.id)
        .gte("log_date", startOfMonth.toISOString().split('T')[0])
        .lte("log_date", endOfMonth.toISOString().split('T')[0]);

      if (error) throw error;

      const logMap: Record<string, { morning: boolean; evening: boolean }> = {};
      (data || []).forEach(log => {
        logMap[log.log_date] = {
          morning: !!log.morning_promise,
          evening: !!log.evening_review
        };
      });
      return logMap;
    }
  });

  // 미션 완료 처리
  const handleCompleteMission = async (type: 'morning' | 'evening') => {
    if (!user?.id) {
      toast({ title: "로그인 필요", description: "미션을 완료하려면 로그인하세요.", variant: "destructive" });
      return;
    }

    // 선택된 날짜가 오늘이 아니면 수정 불가
    if (selectedDateStr !== todayStr) {
      toast({ title: "수정 불가", description: "오늘 날짜의 미션만 수정할 수 있습니다.", variant: "destructive" });
      return;
    }

    try {
      const content = type === 'morning' ? '오늘의 다짐을 완료했습니다.' : '오늘의 성과를 기록했습니다.';

      if (selectedLog) {
        // 기존 로그 업데이트
        const updateData = type === 'morning'
          ? { morning_promise: content }
          : { evening_review: content };

        const { error } = await supabase
          .from("daily_logs")
          .update(updateData)
          .eq("id", selectedLog.id);

        if (error) throw error;
      } else {
        // 새 로그 생성 - talk_room_id는 nullable (토크룸 없이도 미션 가능)
        const { data: participant } = await supabase
          .from("room_participants")
          .select("room_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        const newLog: any = {
          user_id: user.id,
          log_date: selectedDateStr,
          day_number: 1,
          morning_promise: type === 'morning' ? content : null,
          evening_review: type === 'evening' ? content : null
        };

        // 참여 중인 룸이 있으면 연결
        if (participant?.room_id) {
          newLog.talk_room_id = participant.room_id;
        }

        const { error } = await supabase
          .from("daily_logs")
          .insert(newLog);

        if (error) throw error;
      }

      // 연속 달성일 업데이트 (저녁 성과 완료 시)
      if (type === 'evening') {
        const { data: userData } = await supabase
          .from("users")
          .select("streak_days")
          .eq("id", user.id)
          .single();

        await supabase
          .from("users")
          .update({ streak_days: (userData?.streak_days || 0) + 1 })
          .eq("id", user.id);
      }

      toast({
        title: "완료!",
        description: type === 'morning' ? "아침 다짐이 기록되었습니다." : "저녁 성과가 기록되었습니다."
      });

      refetchLog();
    } catch (err) {
      console.error("Failed to complete mission:", err);
      toast({ title: "오류", description: "미션 완료 처리에 실패했습니다.", variant: "destructive" });
    }
  };

  // 캘린더 날짜 생성
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    const days: (Date | null)[] = [];

    // 시작 패딩
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // 날짜들
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const goToPrevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold">일일 미션</h1>
            <p className="text-sm text-muted-foreground">오늘의 훈련을 기록하세요</p>
          </header>
          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
            <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 mb-4">로그인이 필요합니다.</p>
            <button
              onClick={() => navigate("/auth")}
              className="px-4 py-2 bg-black text-white rounded-lg text-sm"
            >
              로그인하기
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">일일 미션</h1>
          <p className="text-sm text-muted-foreground">오늘의 훈련을 기록하세요</p>
        </header>

        {/* 통계 요약 */}
        {isLoadingStats ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : stats && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
              <div className="text-lg font-semibold">{stats.currentStreak}</div>
              <div className="text-xs text-gray-500">연속</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <Trophy className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
              <div className="text-lg font-semibold">{stats.bestStreak}</div>
              <div className="text-xs text-gray-500">최고</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <CheckCircle className="w-4 h-4 mx-auto text-green-500 mb-1" />
              <div className="text-lg font-semibold">{stats.completedDays}</div>
              <div className="text-xs text-gray-500">완료</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto text-blue-500 mb-1" />
              <div className="text-lg font-semibold">{stats.weeklyRate}%</div>
              <div className="text-xs text-gray-500">주간</div>
            </div>
          </div>
        )}

        {/* 뷰 모드 토글 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setViewMode('today'); setSelectedDate(new Date()); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'today' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            오늘
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'calendar' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            캘린더
          </button>
        </div>

        {/* 캘린더 뷰 */}
        {viewMode === 'calendar' && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={goToPrevMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium">
                {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
              </span>
              <button onClick={goToNextMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center text-xs text-gray-500 py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((date, idx) => {
                if (!date) return <div key={idx} />;

                const dateStr = date.toISOString().split('T')[0];
                const log = monthLogs?.[dateStr];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDateStr;
                const isFuture = date > new Date();

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    disabled={isFuture}
                    className={`
                      aspect-square rounded-lg text-sm relative transition-colors
                      ${isSelected ? 'bg-black text-white' : ''}
                      ${isToday && !isSelected ? 'bg-blue-50 text-blue-600 font-medium' : ''}
                      ${isFuture ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}
                    `}
                  >
                    {date.getDate()}
                    {log && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {log.morning && <div className="w-1 h-1 rounded-full bg-yellow-500" />}
                        {log.evening && <div className="w-1 h-1 rounded-full bg-green-500" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 선택된 날짜 미션 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">
              {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              {selectedDateStr === todayStr && <span className="ml-1 text-blue-500">(오늘)</span>}
            </span>
          </div>

          {isLoadingLog ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* 아침 다짐 */}
              <div
                className={`p-4 border rounded-lg transition-colors ${
                  selectedLog?.morning_promise
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">아침 다짐</span>
                  </div>
                  {selectedLog?.morning_promise ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {selectedLog?.morning_promise || '오늘 하루 실천할 목표를 다짐하세요'}
                </p>
                {selectedDateStr === todayStr && !selectedLog?.morning_promise && (
                  <button
                    onClick={() => handleCompleteMission('morning')}
                    className="w-full py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600"
                  >
                    아침 다짐 완료하기
                  </button>
                )}
              </div>

              {/* 저녁 성과 */}
              <div
                className={`p-4 border rounded-lg transition-colors ${
                  selectedLog?.evening_review
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-500" />
                    <span className="font-medium">저녁 성과</span>
                  </div>
                  {selectedLog?.evening_review ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {selectedLog?.evening_review || '오늘 하루 실천한 내용을 기록하세요'}
                </p>
                {selectedDateStr === todayStr && !selectedLog?.evening_review && (
                  <button
                    onClick={() => handleCompleteMission('evening')}
                    className="w-full py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600"
                  >
                    저녁 성과 기록하기
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* 동기부여 메시지 */}
        {stats && stats.currentStreak > 0 && (
          <div className="mt-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4" />
              <span className="font-medium">연속 {stats.currentStreak}일 달성!</span>
            </div>
            <p className="text-sm text-orange-100">
              {stats.currentStreak >= 7
                ? '대단해요! 일주일 넘게 꾸준히 실천하고 계시네요.'
                : '좋아요! 조금만 더 하면 일주일 연속 달성이에요.'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
