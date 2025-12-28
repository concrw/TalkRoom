import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Flame, Target, TrendingUp, Play, CheckCircle, Circle, Sun, Moon, Plus, Compass, Users, BookOpen } from "lucide-react";

interface TalkRoom {
  id: string;
  title: string;
  description?: string;
  media_url?: string;
  media_type?: string;
  price_cents: number;
  price_currency: string;
  capacity: number;
  host_id: string;
  starts_at: string;
  keywords?: string[];
  is_public: boolean;
}

interface DailyStats {
  totalMissions: number;
  completedMissions: number;
  streak: number;
  todayMorningPromise: boolean;
  todayEveningReview: boolean;
  weeklyCompletionRate: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "TALKROOM - 실행 중심 북클럽";
  }, []);

  // Fetch user's daily stats
  const { data: stats } = useQuery({
    queryKey: ["daily-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 전체 로그
      const { data: logs, error } = await supabase
        .from("daily_logs")
        .select("id, log_date, morning_promise, evening_review")
        .eq("user_id", user!.id)
        .order("log_date", { ascending: false });

      if (error) throw error;

      const totalMissions = logs?.length || 0;
      const completedMissions = logs?.filter(log => log.evening_review).length || 0;

      // 오늘의 다짐/성과 확인
      const todayLog = logs?.find(log => log.log_date === today);
      const todayMorningPromise = !!todayLog?.morning_promise;
      const todayEveningReview = !!todayLog?.evening_review;

      // 주간 완료율
      const weeklyLogs = logs?.filter(log => log.log_date >= weekAgo) || [];
      const weeklyCompleted = weeklyLogs.filter(log => log.evening_review).length;
      const weeklyCompletionRate = weeklyLogs.length > 0
        ? Math.round((weeklyCompleted / weeklyLogs.length) * 100)
        : 0;

      const { data: userData } = await supabase
        .from("users")
        .select("streak_days")
        .eq("id", user!.id)
        .single();

      return {
        totalMissions,
        completedMissions,
        streak: userData?.streak_days || 0,
        todayMorningPromise,
        todayEveningReview,
        weeklyCompletionRate
      } as DailyStats;
    }
  });

  // Fetch user's participating rooms
  const { data: myRooms } = useQuery({
    queryKey: ["my-rooms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: parts, error: e1 } = await supabase
        .from("room_participants")
        .select("room_id")
        .eq("user_id", user!.id);

      if (e1) throw e1;
      const ids = (parts || []).map((p: any) => p.room_id);
      if (ids.length === 0) return [];

      const { data: rooms, error: e2 } = await supabase
        .from("talk_rooms")
        .select("*")
        .in("id", ids)
        .order("starts_at", { ascending: true });

      if (e2) throw e2;
      return rooms || [];
    }
  });

  // Fetch recommended/public rooms
  const { data: recommendedRooms } = useQuery({
    queryKey: ["recommended-rooms"],
    queryFn: async () => {
      const { data: rooms, error } = await supabase
        .from("talk_rooms")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return rooms || [];
    }
  });

  const roomsToShow = recommendedRooms || [];

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Hero Section with Action Buttons */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">TALKROOM</h1>
          <p className="text-gray-500 mb-8">실행 중심 북클럽에 오신 것을 환영합니다</p>

          {/* Main Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => navigate("/create-room")}
              className="p-6 border-2 border-primary bg-primary text-white rounded-xl hover:bg-primary/90 transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              <Plus className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">토크룸 만들기</div>
              <div className="text-xs opacity-90 mt-1">호스트로 시작하기</div>
            </button>
            <button
              onClick={() => navigate("/explore")}
              className="p-6 border-2 border-gray-300 rounded-xl hover:border-primary hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              <Compass className="w-6 h-6 mx-auto mb-2" />
              <div className="font-semibold">토크룸 찾기</div>
              <div className="text-xs text-gray-500 mt-1">관심사 탐색하기</div>
            </button>
          </div>

          {/* Secondary Action Buttons */}
          {user && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate("/my-rooms")}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Users className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                <div className="text-sm font-medium">내 토크룸</div>
                {myRooms && myRooms.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">{myRooms.length}개 참여 중</div>
                )}
              </button>
              <button
                onClick={() => navigate("/daily")}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <BookOpen className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                <div className="text-sm font-medium">오늘의 미션</div>
                {stats && (
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.todayMorningPromise && stats.todayEveningReview ? '완료' : '진행 중'}
                  </div>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Stats Section - Only show if user is logged in */}
        {user && stats && (
          <div className="mb-12 space-y-6">
            {/* 오늘의 미션 */}
            <div>
              <h2 className="text-xl font-semibold mb-4">오늘의 미션</h2>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    stats.todayMorningPromise
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => navigate("/daily")}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">아침 다짐</span>
                    {stats.todayMorningPromise ? (
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {stats.todayMorningPromise ? '완료!' : '오늘의 다짐을 작성하세요'}
                  </p>
                </div>
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    stats.todayEveningReview
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => navigate("/daily")}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium">저녁 성과</span>
                    {stats.todayEveningReview ? (
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {stats.todayEveningReview ? '완료!' : '오늘의 성과를 기록하세요'}
                  </p>
                </div>
              </div>
            </div>

            {/* 통계 요약 */}
            <div>
              <h2 className="text-xl font-semibold mb-4">나의 현황</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-gray-500">연속</span>
                  </div>
                  <div className="text-2xl font-semibold">{stats.streak}</div>
                  <div className="text-xs text-gray-400">일</div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-gray-500">누적</span>
                  </div>
                  <div className="text-2xl font-semibold">{stats.completedMissions}</div>
                  <div className="text-xs text-gray-400">/ {stats.totalMissions}</div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-500">주간</span>
                  </div>
                  <div className="text-2xl font-semibold">{stats.weeklyCompletionRate}</div>
                  <div className="text-xs text-gray-400">%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Rooms Section - Only show if user is logged in */}
        {user && myRooms && myRooms.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">참여 중인 토크룸</h2>
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => navigate("/my-rooms")}
              >
                전체보기
              </button>
            </div>
            <div className="space-y-3">
              {myRooms.slice(0, 3).map((room: any) => (
                <div
                  key={room.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors"
                  onClick={() => navigate(`/rooms/${room.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{room.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{new Date(room.starts_at).toLocaleDateString("ko-KR")}</span>
                        <span>{room.capacity}명</span>
                      </div>
                    </div>
                    <Play className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-12">
          <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            className="w-full pl-8 pr-4 py-4 border-0 border-b border-gray-200 focus:outline-none focus:border-gray-400 text-lg placeholder-gray-400 bg-transparent"
            placeholder="토크룸 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => navigate("/explore")}
          />
        </div>

        {/* Recommended Rooms */}
        <div>
          <h2 className="text-xl font-semibold mb-6">추천 토크룸</h2>
          <div className="space-y-0">
            {roomsToShow.map((room, index) => (
              <div
                key={room.id}
                className="group py-6 cursor-pointer hover:bg-gray-50 -mx-4 px-4 transition-colors duration-150"
                onClick={() => navigate(`/rooms/${room.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 font-medium mb-1 group-hover:text-primary transition-colors">
                      {room.title}
                    </h3>
                    {room.description && (
                      <p className="text-gray-500 text-sm mb-2">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{new Date(room.starts_at).toLocaleDateString("ko-KR")}</span>
                      <span>{room.capacity}명</span>
                      <span>₩{(room.price_cents / 100).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {index < roomsToShow.length - 1 && (
                  <div className="border-b border-gray-100 mt-6"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* View All Button */}
        <div className="mt-8 text-center">
          <button
            className="px-6 py-3 text-sm text-gray-600 hover:text-primary transition-colors"
            onClick={() => navigate("/explore")}
          >
            모든 토크룸 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
