import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Search } from 'lucide-react';
import { useAuth } from "@/hooks/useAuth";

interface TalkRoom {
  id: string;
  title: string;
  description: string;
  media_url?: string;
  media_type: string;
  price_cents: number;
  price_currency: string;
  capacity: number;
  host_id: string;
  starts_at: string;
  keywords: string[];
  is_public: boolean;
  replay_available: boolean;
  training_weeks: number;
  created_at: string;
  updated_at: string;
  status?: 'live' | 'upcoming' | 'completed';
}

const Explore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allRooms, setAllRooms] = useState<TalkRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // 샘플 데이터
  const sampleRooms: TalkRoom[] = [
    {
      id: "sample-1",
      title: "아토믹 해빗",
      description: "작은 습관이 만드는 큰 변화",
      media_type: "book",
      media_url: "/images/pop1.jpg",
      price_cents: 1500000,
      price_currency: "KRW",
      capacity: 8,
      host_id: "sample-host-1",
      starts_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      keywords: ["습관", "자기계발"],
      is_public: true,
      replay_available: false,
      training_weeks: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "upcoming"
    },
    {
      id: "sample-2",
      title: "미라클 모닝",
      description: "성공하는 사람들의 아침 루틴",
      media_type: "book",
      media_url: "/images/pop2.jpg",
      price_cents: 1200000,
      price_currency: "KRW",
      capacity: 6,
      host_id: "sample-host-2",
      starts_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      keywords: ["루틴", "생산성"],
      is_public: true,
      replay_available: false,
      training_weeks: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "upcoming"
    },
    {
      id: "sample-3",
      title: "사피엔스",
      description: "인류 문명의 역사",
      media_type: "book",
      media_url: "/images/pop3.jpg",
      price_cents: 1800000,
      price_currency: "KRW",
      capacity: 10,
      host_id: "sample-host-3",
      starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      keywords: ["역사", "인문학"],
      is_public: true,
      replay_available: false,
      training_weeks: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "upcoming"
    },
    {
      id: "sample-4",
      title: "부의 추월차선",
      description: "젊어서 부자가 되는 방법",
      media_type: "book",
      media_url: "/images/pop1.jpg",
      price_cents: 1600000,
      price_currency: "KRW",
      capacity: 6,
      host_id: "sample-host-4",
      starts_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      keywords: ["재테크", "투자"],
      is_public: true,
      replay_available: false,
      training_weeks: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "upcoming"
    },
    {
      id: "sample-5",
      title: "데일 카네기 인간관계론",
      description: "사람의 마음을 움직이는 대화법",
      media_type: "book",
      media_url: "/images/pop2.jpg",
      price_cents: 1400000,
      price_currency: "KRW",
      capacity: 8,
      host_id: "sample-host-5",
      starts_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      keywords: ["소통", "관계"],
      is_public: true,
      replay_available: false,
      training_weeks: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "upcoming"
    }
  ];

  useEffect(() => {
    fetchTalkRooms();
  }, []);

  const fetchTalkRooms = async () => {
    setLoading(true);
    try {
      const { data: rooms, error } = await supabase
        .from('talk_rooms')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllRooms(rooms || []);
    } catch (error) {
      console.error('Error fetching talk rooms:', error);
      setAllRooms(sampleRooms);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = allRooms.filter(room =>
    room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.keywords?.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const roomsToShow = filteredRooms.length > 0 ? filteredRooms : sampleRooms;

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-8 py-16">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-50 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-8 py-16">
        {/* 검색 */}
        <div className="relative mb-16">
          <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            className="w-full pl-8 pr-4 py-4 border-0 border-b border-gray-200 focus:outline-none focus:border-gray-400 text-lg placeholder-gray-400 bg-transparent"
            placeholder="검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 토크룸 목록 */}
        <div className="space-y-0">
          {roomsToShow.map((room, index) => (
            <div 
              key={room.id}
              className="group py-6 cursor-pointer hover:bg-gray-50 -mx-4 px-4 transition-colors duration-150"
              onClick={() => navigate(`/rooms/${room.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 font-medium mb-1 group-hover:text-blue-600 transition-colors">
                    {room.title}
                  </h3>
                  <p className="text-gray-500 text-sm mb-2">
                    {room.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{new Date(room.starts_at).toLocaleDateString('ko-KR')}</span>
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

        {/* 검색 결과 없음 */}
        {searchQuery && filteredRooms.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-400">검색 결과가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;