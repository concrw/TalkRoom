import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Calendar, Clock, Target, TrendingUp, Star,
  ChevronDown, ChevronUp, Flame, Trophy,
  AlertCircle, Play, Plus
} from 'lucide-react';

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  type: string;
  status: string;
  participants?: string;
  isMine?: boolean;
}

interface UrgentTask {
  id: number;
  type: string;
  title: string;
  status: string;
  action: string;
}

export default function Schedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 상태 관리
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  useEffect(() => {
    document.title = "일정 - TALKROOM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "오늘의 다짐/리뷰와 참가 예정 토크룸을 확인하세요.");
  }, []);

  // 기존 훈련 코스 데이터
  const { data: course } = useQuery({
    queryKey: ["schedule-course", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_courses")
        .select("id,start_date,total_days")
        .eq("user_id", user!.id)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // 기존 예정된 토크룸 데이터
  const { data: upcoming } = useQuery({
    queryKey: ["schedule-upcoming", user?.id],
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
        .select("id, title, media_type, media_url, keywords, starts_at, capacity, price_cents, price_currency")
        .in("id", ids)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (e2) throw e2;
      return rooms || [];
    },
  });

  // 오늘의 긴급 작업 체크
  const { data: urgentTasks } = useQuery({
    queryKey: ["urgent-tasks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const tasks: UrgentTask[] = [];
      
      const currentHour = new Date().getHours();
      if (currentHour < 12) {
        tasks.push({
          id: 1,
          type: 'morning_promise',
          title: '아침 다짐글 작성',
          status: 'missed',
          action: '작성하기'
        });
      }
      
      const liveRooms = upcoming?.filter(room => {
        const startTime = new Date(room.starts_at as string);
        const now = new Date();
        return startTime <= now && startTime.getTime() + (2 * 60 * 60 * 1000) > now.getTime();
      });
      
      if (liveRooms && liveRooms.length > 0) {
        tasks.push({
          id: 2,
          type: 'live_room',
          title: `${liveRooms[0].title} LIVE 입장 가능`,
          status: 'available',
          action: '참여하기'
        });
      }
      
      return tasks;
    },
  });

  // 전체 토크룸 데이터
  const { data: allTalkrooms } = useQuery({
    queryKey: ["all-talkrooms"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("talk_rooms")
        .select("id, title, starts_at, capacity, price_cents, keywords")
        .gte("starts_at", today)
        .lte("starts_at", today + 'T23:59:59')
        .order("starts_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // 훈련 진행률 계산
  const progress = useMemo(() => {
    if (!course) return null;
    const now = new Date();
    const start = new Date(course.start_date as string);
    const days = Math.floor((now.getTime() - start.getTime()) / (1000*60*60*24)) + 1;
    const current = Math.max(1, Math.min(days, course.total_days as number));
    const percent = Math.round((current / (course.total_days as number)) * 100);
    return { percent, label: `${current}/${course.total_days}일` };
  }, [course]);

  // 더미 데이터
  const [weeklyStats] = useState({
    streak: 3,
    completedMissions: 18,
    totalMissions: 21,
    daysToNextGoal: 2
  });

  // 더미 토크룸 데이터 (실제 데이터가 없을 때)
  const dummyMyRooms = [
    {
      id: "1",
      title: "아침 루틴 만들기",
      time: "09:00",
      type: "scheduled",
      status: "upcoming"
    },
    {
      id: "2", 
      title: "독서 습관 토크룸",
      time: "20:00",
      type: "scheduled", 
      status: "ongoing"
    }
  ];

  const dummyAllRooms = [
    {
      id: "1",
      title: "아침 루틴 만들기",
      time: "09:00",
      type: "scheduled",
      status: "upcoming",
      participants: "8명",
      isMine: true
    },
    {
      id: "2",
      title: "독서 습관 토크룸", 
      time: "20:00",
      type: "scheduled",
      status: "ongoing",
      participants: "12명", 
      isMine: true
    },
    {
      id: "3",
      title: "운동 동기부여",
      time: "07:30",
      type: "scheduled",
      status: "upcoming", 
      participants: "6명",
      isMine: false
    },
    {
      id: "4",
      title: "영어 스피킹 연습",
      time: "19:30", 
      type: "scheduled",
      status: "upcoming",
      participants: "15명",
      isMine: false
    }
  ];

  // 유틸리티 함수들
  const generateCalendar = () => {
    const today = new Date();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendar = [];
    const scheduleDate = [3, 7, 15, 22, 25, 28];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      calendar.push({
        date: date.getDate(),
        isCurrentMonth: date.getMonth() === currentMonth,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        hasSchedule: scheduleDate.includes(date.getDate()) && date.getMonth() === currentMonth
      });
    }

    return calendar;
  };

  const handleTaskAction = (taskId: number, taskType: string) => {
    if (taskType === 'morning_promise') {
      navigate('/daily');
    } else if (taskType === 'live_room') {
      const liveRoom = upcoming?.find(room => 
        new Date(room.starts_at as string) <= new Date()
      );
      if (liveRoom) {
        navigate(`/rooms/${liveRoom.id}`);
      }
    }
  };

  // 오늘 일정 데이터 준비 (더미 데이터 포함)
  const todaySchedule: ScheduleItem[] = viewMode === 'my' 
    ? (upcoming && upcoming.length > 0 
        ? upcoming.map(room => ({
            id: room.id as string,
            time: new Date(room.starts_at as string).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            title: room.title as string,
            type: 'scheduled',
            status: new Date(room.starts_at as string) <= new Date() ? 'ongoing' : 'upcoming'
          }))
        : dummyMyRooms
      )
    : (allTalkrooms && allTalkrooms.length > 0
        ? allTalkrooms.map(room => ({
            id: room.id as string,
            time: new Date(room.starts_at as string).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            title: room.title as string,
            type: 'scheduled',
            status: new Date(room.starts_at as string) <= new Date() ? 'ongoing' : 'upcoming',
            participants: `${Math.floor(Math.random() * 20) + 5}명`,
            isMine: upcoming?.some(my => my.id === room.id) || false
          }))
        : dummyAllRooms
      );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-3">
          <h1 className="text-lg font-semibold text-gray-900">일정</h1>
          <p className="text-xs text-gray-600">오늘의 다짐과 토크룸</p>
        </div>
      </header>

      <div className="p-3 space-y-4 pb-20">
        {/* 전체/내 일정 스위치 */}
        <div className="bg-white rounded-lg p-1 flex border border-gray-200">
          <button
            onClick={() => setViewMode('my')}
            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'my' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            내 일정
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'all' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            전체 일정
          </button>
        </div>

        {/* 긴급 액션 섹션 */}
        {viewMode === 'my' && urgentTasks && urgentTasks.length > 0 && (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-lg p-3 text-white">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" />
              <h2 className="text-xs font-semibold">지금 해야 할 일</h2>
            </div>
            <div className="space-y-1">
              {urgentTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-white">{task.title}</span>
                  <button
                    onClick={() => handleTaskAction(task.id, task.type)}
                    className="bg-white text-red-600 px-2 py-0.5 rounded text-xs font-medium hover:bg-red-50"
                  >
                    {task.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 달력 섹션 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <button
            onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
            className="flex items-center justify-between w-full mb-2"
          >
            <h2 className="text-xs font-medium text-gray-900">
              {selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
            </h2>
            {isCalendarExpanded ? (
              <ChevronUp className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            )}
          </button>

          {isCalendarExpanded && (
            <div className="grid grid-cols-7 gap-1 text-xs">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center text-gray-500 py-1">
                  {day}
                </div>
              ))}
              {generateCalendar().map((day, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day.date))}
                  className={`
                    text-center py-1 relative
                    ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}
                    ${day.isToday ? 'bg-gray-900 text-white' : ''}
                    ${day.isSelected && !day.isToday ? 'bg-gray-100' : ''}
                    hover:bg-gray-50
                  `}
                >
                  {day.date}
                  {day.hasSchedule && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-400 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 오늘 일정 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium text-gray-900">
              {viewMode === 'my' ? '내' : '전체'} 오늘 일정
            </h2>
            {viewMode === 'all' && (
              <span className="text-xs text-gray-500">
                {todaySchedule.filter(item => item.isMine).length}개 참여
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            {todaySchedule.length === 0 ? (
              <div className="py-4 text-center text-gray-400 text-xs">
                예정된 토크룸이 없습니다
              </div>
            ) : (
              todaySchedule.map((item, index) => (
                <div key={item.id} className="group py-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-900">{item.title}</span>
                        {item.status === 'ongoing' && (
                          <div className="flex items-center gap-1 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs">
                            <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                            LIVE
                          </div>
                        )}
                        {viewMode === 'all' && item.isMine && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-900 text-white rounded-full">참여중</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{item.time}</span>
                        {viewMode === 'all' && item.participants && (
                          <span>{item.participants}</span>
                        )}
                      </div>
                    </div>
                    {(item.status === 'ongoing' || (viewMode === 'all' && !item.isMine)) && (
                      <button
                        onClick={() => navigate(`/rooms/${item.id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {item.status === 'ongoing' ? '참여하기' : '관심목록'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 훈련 진행률 vs 인기 시간대 */}
        {viewMode === 'my' ? (
          <>
            {/* 훈련 진행률 */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h2 className="text-xs font-medium text-gray-900 mb-2">훈련 진행률</h2>
              {course ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-900">현재 코스</span>
                    <span className="text-xs text-gray-600">
                      {progress?.label || '0/0일'}
                      {progress?.percent === 100 && <span className="text-green-600 ml-1">(완료)</span>}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5">
                    <div 
                      className="bg-gray-900 h-1.5 transition-all duration-300"
                      style={{ width: `${progress?.percent || 0}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="py-3 text-center">
                  <p className="text-gray-400 text-xs mb-1">진행 중인 훈련이 없습니다</p>
                  <Link to="/talk-rooms" className="text-xs text-blue-600 hover:text-blue-800">
                    토크룸 참여하기
                  </Link>
                </div>
              )}
            </div>

            {/* 이번 주 성취 */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h2 className="text-xs font-medium text-gray-900 mb-2">이번 주 성취</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900 mb-1">{weeklyStats.streak}</div>
                  <div className="text-xs text-gray-500">연속 달성</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {weeklyStats.completedMissions}/{weeklyStats.totalMissions}
                  </div>
                  <div className="text-xs text-gray-500">완료한 미션</div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="text-xs text-gray-600">
                  다음 목표까지 <span className="font-medium text-gray-900">{weeklyStats.daysToNextGoal}일</span> 남음
                </span>
              </div>
            </div>
          </>
        ) : (
          /* 인기 시간대 */
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <h2 className="text-xs font-medium text-gray-900 mb-2">인기 시간대</h2>
            <div className="space-y-1">
              {[
                { time: '오후 8시 - 10시', count: '5개 토크룸' },
                { time: '오후 2시 - 4시', count: '3개 토크룸' },
                { time: '오전 10시 - 12시', count: '2개 토크룸' }
              ].map((slot, index) => (
                <div key={index} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-gray-900">{slot.time}</span>
                  <span className="text-xs text-gray-500">{slot.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 참가 예정 토크룸 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <h2 className="text-xs font-medium text-gray-900 mb-2">참가 예정 토크룸</h2>
          {!upcoming || upcoming.length === 0 ? (
            <div className="py-3 text-center">
              <p className="text-gray-400 text-xs mb-1">예정된 토크룸이 없습니다</p>
              <Link to="/talk-rooms" className="text-xs text-blue-600 hover:text-blue-800">
                토크룸 탐색하기
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((room: any, index: number) => (
                <div key={room.id} className="py-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xs text-gray-900 mb-1">{room.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{new Date(room.starts_at).toLocaleDateString('ko-KR')}</span>
                        <span>{room.capacity}명</span>
                        <span>₩{(room.price_cents / 100).toLocaleString()}</span>
                      </div>
                    </div>
                    {new Date(room.starts_at) <= new Date() && (
                      <button
                        onClick={() => navigate(`/rooms/${room.id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        참여하기
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 빠른 액션 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="space-y-1">
            <Link 
              to="/daily" 
              className="flex items-center gap-2 py-2 text-xs text-blue-600 hover:text-blue-800"
            >
              <Plus className="w-3 h-3" />
              오늘의 다짐/리뷰 작성
            </Link>
            <Link 
              to="/talk-rooms" 
              className="flex items-center gap-2 py-2 text-xs text-blue-600 hover:text-blue-800"
            >
              <Play className="w-3 h-3" />
              토크룸 탐색하기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}