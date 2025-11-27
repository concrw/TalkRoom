import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Flame, Target, TrendingUp, Play } from "lucide-react";

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
      const { data: logs, error } = await supabase
        .from("daily_logs")
        .select("id, log_date")
        .eq("user_id", user!.id)
        .order("log_date", { ascending: false });

      if (error) throw error;

      const totalMissions = logs?.length || 0;
      const completedMissions = logs?.filter(log => log.log_date).length || 0;

      const { data: userData } = await supabase
        .from("users")
        .select("streak_days")
        .eq("id", user!.id)
        .single();

      return {
        totalMissions,
        completedMissions,
        streak: userData?.streak_days || 0
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

  const sampleRooms: TalkRoom[] = [
    {
      id: "sample-1",
      title: "아토믹 해빗",
      description: "작은 습관이 만드는 큰 변화",
      media_type: "book",
      price_cents: 1500000,
      price_currency: "KRW",
      capacity: 8,
      host_id: "sample-host-1",
      starts_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      keywords: ["습관", "자기계발"],
      is_public: true
    },
    {
      id: "sample-2",
      title: "미라클 모닝",
      description: "성공하는 사람들의 아침 루틴",
      media_type: "book",
      price_cents: 1200000,
      price_currency: "KRW",
      capacity: 6,
      host_id: "sample-host-2",
      starts_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      keywords: ["루틴", "생산성"],
      is_public: true
    },
    {
      id: "sample-3",
      title: "사피엔스",
      description: "인류 문명의 역사",
      media_type: "book",
      price_cents: 1800000,
      price_currency: "KRW",
      capacity: 10,
      host_id: "sample-host-3",
      starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      keywords: ["역사", "인문학"],
      is_public: true
    }
  ];

  const roomsToShow = recommendedRooms && recommendedRooms.length > 0 ? recommendedRooms : sampleRooms;

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Stats Section - Only show if user is logged in */}
        {user && stats && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-6">오늘의 현황</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs text-gray-500">완료</span>
                </div>
                <div className="text-2xl font-semibold">{stats.completedMissions}</div>
                <div className="text-xs text-gray-400">/ {stats.totalMissions} 미션</div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-warning" />
                  <span className="text-xs text-gray-500">연속</span>
                </div>
                <div className="text-2xl font-semibold">{stats.streak}</div>
                <div className="text-xs text-gray-400">일</div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-xs text-gray-500">달성률</span>
                </div>
                <div className="text-2xl font-semibold">
                  {stats.totalMissions > 0 ? Math.round((stats.completedMissions / stats.totalMissions) * 100) : 0}
                </div>
                <div className="text-xs text-gray-400">%</div>
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
