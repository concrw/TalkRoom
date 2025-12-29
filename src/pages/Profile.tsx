import { useState, useEffect } from "react";
import {
  User, Award, TrendingUp, Target,
  BookOpen, Dumbbell, Brain,
  Bell, Lock, CreditCard, Download, Trash2, Star,
  Flame, Trophy,
  ChevronRight, Edit3,
  Gift, Loader2,
  LucideIcon
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// 인터페이스 정의
interface UserProfile {
  name: string;
  nickname: string;
  bio: string;
  level: number;
  currentExp: number;
  nextLevelExp: number;
  joinDate: string;
  consecutiveDays: number;
  profileImage: string | null;
}

interface CoreStats {
  executionRate: number;
  completionRate: number;
  streak: number;
  level: number;
  totalExperience: number;
}

interface Badge {
  id: number;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  earnedDate?: string;
  progress?: number;
  target?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface WeeklyDay {
  day: string;
  rate: number;
  mood: string;
}

interface CategoryData {
  completed: number;
  total: number;
  rate: number;
}

interface DetailedStats {
  totalPromises: number;
  completedPromises: number;
  totalTrainings: number;
  completedTrainings: number;
  totalTalkrooms: number;
  supportMessages: {
    sent: number;
    received: number;
  };
  categories: {
    exercise: CategoryData;
    reading: CategoryData;
    meditation: CategoryData;
    learning: CategoryData;
  };
}

interface StatCardProps {
  title: string;
  value: number;
  unit: string;
  color: string;
  icon: LucideIcon;
  trend?: number;
}

interface BadgeCardProps {
  badge: Badge;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showBadgeDetail, setShowBadgeDetail] = useState<Badge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 알림 설정
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    morningReminder: true,
    morningTime: '07:00',
    eveningReminder: true,
    eveningTime: '21:00',
    cheerNotification: true,
    systemNotification: true
  });

  // 알림 설정 로드
  useEffect(() => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      setNotificationSettings(JSON.parse(saved));
    }
  }, []);

  // 알림 설정 저장
  const handleSaveNotifications = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    toast({ title: "저장 완료", description: "알림 설정이 저장되었습니다." });
    setShowNotificationSettings(false);
  };

  // 사용자 기본 정보
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    nickname: '',
    bio: '',
    level: 1,
    currentExp: 0,
    nextLevelExp: 100,
    joinDate: '',
    consecutiveDays: 0,
    profileImage: null
  });

  // 핵심 지표
  const [coreStats, setCoreStats] = useState<CoreStats>({
    executionRate: 0,
    completionRate: 0,
    streak: 0,
    level: 1,
    totalExperience: 0
  });

  // 상세 통계
  const [detailedStats, setDetailedStats] = useState<DetailedStats>({
    totalPromises: 0,
    completedPromises: 0,
    totalTrainings: 0,
    completedTrainings: 0,
    totalTalkrooms: 0,
    supportMessages: { sent: 0, received: 0 },
    categories: {
      exercise: { completed: 0, total: 0, rate: 0 },
      reading: { completed: 0, total: 0, rate: 0 },
      meditation: { completed: 0, total: 0, rate: 0 },
      learning: { completed: 0, total: 0, rate: 0 }
    }
  });

  useEffect(() => {
    document.title = "프로필 - TALKROOM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "나의 실행 여정과 성취를 확인하세요.");
  }, []);

  // 프로필 및 통계 데이터 로드
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 1. 사용자 기본 정보
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (userError) throw userError;

        if (userData) {
          setUserProfile({
            name: userData.name || '사용자',
            nickname: userData.name || '사용자',
            bio: userData.bio || '아직 자기소개가 없습니다.',
            level: userData.level || 1,
            currentExp: (userData.level || 1) * 100 - 50,
            nextLevelExp: (userData.level || 1) * 100,
            joinDate: userData.created_at?.split('T')[0] || '',
            consecutiveDays: userData.streak_days || 0,
            profileImage: userData.avatar_url
          });

          setCoreStats(prev => ({
            ...prev,
            streak: userData.streak_days || 0,
            level: userData.level || 1,
            totalExperience: (userData.level || 1) * 100
          }));
        }

        // 2. 참여 토크룸 수
        const { count: roomCount } = await supabase
          .from("room_participants")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", user.id);

        // 3. 완료한 훈련 코스 수
        const { data: coursesData } = await supabase
          .from("training_courses")
          .select("id")
          .eq("user_id", user.id);

        // 4. 일일 로그 통계
        const { data: logsData } = await supabase
          .from("daily_logs")
          .select("morning_promise, evening_review")
          .eq("user_id", user.id);

        const totalPromises = logsData?.filter(l => l.morning_promise).length || 0;
        const completedPromises = logsData?.filter(l => l.evening_review).length || 0;
        const executionRate = totalPromises > 0 ? Math.round((completedPromises / totalPromises) * 100) : 0;
        const streakDays = userData?.streak_days || 0;

        // 5. 카테고리별 통계 (참여한 토크룸의 keywords 기반)
        const { data: participatedRooms } = await supabase
          .from("room_participants")
          .select("room_id")
          .eq("user_id", user.id);

        const roomIds = (participatedRooms || []).map(p => p.room_id);

        let categoryStats = {
          exercise: { completed: 0, total: 0, rate: 0 },
          reading: { completed: 0, total: 0, rate: 0 },
          meditation: { completed: 0, total: 0, rate: 0 },
          learning: { completed: 0, total: 0, rate: 0 }
        };

        if (roomIds.length > 0) {
          const { data: roomsData } = await supabase
            .from("talk_rooms")
            .select("keywords")
            .in("id", roomIds);

          // 키워드 기반 카테고리 분류
          const exerciseKeywords = ['운동', '헬스', '피트니스', '달리기', '요가', 'exercise', 'fitness', 'gym'];
          const readingKeywords = ['독서', '책', '읽기', '문학', 'book', 'reading'];
          const meditationKeywords = ['명상', '마음챙김', 'mindfulness', 'meditation', '수면', '힐링'];
          const learningKeywords = ['학습', '공부', '영어', '개발', '코딩', '자기계발', 'learning', 'study'];

          (roomsData || []).forEach(room => {
            const keywords = (room.keywords || []).map((k: string) => k.toLowerCase());

            if (keywords.some((k: string) => exerciseKeywords.some(ek => k.includes(ek)))) {
              categoryStats.exercise.total++;
              categoryStats.exercise.completed++;
            }
            if (keywords.some((k: string) => readingKeywords.some(rk => k.includes(rk)))) {
              categoryStats.reading.total++;
              categoryStats.reading.completed++;
            }
            if (keywords.some((k: string) => meditationKeywords.some(mk => k.includes(mk)))) {
              categoryStats.meditation.total++;
              categoryStats.meditation.completed++;
            }
            if (keywords.some((k: string) => learningKeywords.some(lk => k.includes(lk)))) {
              categoryStats.learning.total++;
              categoryStats.learning.completed++;
            }
          });

          // 비율 계산
          Object.keys(categoryStats).forEach(key => {
            const cat = categoryStats[key as keyof typeof categoryStats];
            cat.rate = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
          });
        }

        // 레벨 계산
        const levelData = calculateLevel(totalPromises, completedPromises, streakDays);

        // 프로필에 레벨 정보 업데이트
        setUserProfile(prev => ({
          ...prev,
          level: levelData.level,
          currentExp: levelData.currentExp,
          nextLevelExp: levelData.nextLevelExp
        }));

        // 6. 보낸 응원 메시지 수 (feed_posts의 좋아요)
        const { count: sentLikes } = await supabase
          .from("post_likes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        setDetailedStats({
          totalPromises,
          completedPromises,
          totalTrainings: coursesData?.length || 0,
          completedTrainings: coursesData?.length || 0,
          totalTalkrooms: roomCount || 0,
          supportMessages: { sent: sentLikes || 0, received: 0 },
          categories: categoryStats
        });

        setCoreStats(prev => ({
          ...prev,
          executionRate,
          completionRate: coursesData?.length ? 100 : 0,
          streak: streakDays,
          level: levelData.level,
          totalExperience: levelData.totalExp
        }));

        // 배지 달성 여부 계산
        calculateBadges(
          totalPromises,
          userData?.streak_days || 0,
          coursesData?.length || 0,
          roomCount || 0
        );

        // 7. 주간 실행 패턴 계산 (최근 7일)
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);

        const { data: weeklyLogs } = await supabase
          .from("daily_logs")
          .select("log_date, morning_promise, evening_review")
          .eq("user_id", user.id)
          .gte("log_date", sevenDaysAgo.toISOString().split('T')[0])
          .lte("log_date", today.toISOString().split('T')[0])
          .order("log_date", { ascending: true });

        // 요일별 데이터 생성
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const weeklyData: WeeklyDay[] = [];

        for (let i = 0; i < 7; i++) {
          const date = new Date(sevenDaysAgo);
          date.setDate(sevenDaysAgo.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          const dayName = dayNames[date.getDay()];

          const log = (weeklyLogs || []).find(l => l.log_date === dateStr);
          const hasPromise = !!log?.morning_promise;
          const hasReview = !!log?.evening_review;

          // 실행률 계산: 다짐과 실행 모두 있으면 100%, 다짐만 있으면 50%, 없으면 0%
          let rate = 0;
          if (hasPromise && hasReview) rate = 100;
          else if (hasPromise) rate = 50;

          // 기분 이모지 (실행률 기반)
          let mood = '😐';
          if (rate >= 90) mood = '🔥';
          else if (rate >= 70) mood = '😊';
          else if (rate >= 50) mood = '😌';
          else if (rate >= 30) mood = '😅';
          else if (rate > 0) mood = '🤔';
          else mood = '😴';

          weeklyData.push({ day: dayName, rate, mood });
        }

        setWeeklyPattern(weeklyData);

      } catch (err) {
        console.error("Failed to fetch profile data:", err);
        toast({ title: "오류", description: "프로필 정보를 불러오는 데 실패했습니다.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user?.id, toast]);

  // 프로필 수정 모달 열기
  const openEditProfile = () => {
    setEditName(userProfile.name);
    setEditBio(userProfile.bio);
    setShowEditProfile(true);
  };

  // 프로필 저장
  const handleSaveProfile = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          name: editName.trim() || '사용자',
          bio: editBio.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setUserProfile(prev => ({
        ...prev,
        name: editName.trim() || '사용자',
        nickname: editName.trim() || '사용자',
        bio: editBio.trim() || '아직 자기소개가 없습니다.',
      }));

      toast({ title: "저장 완료", description: "프로필이 수정되었습니다." });
      setShowEditProfile(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast({ title: "오류", description: "프로필 저장에 실패했습니다.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // 배지 정의 및 달성 상태
  const [badges, setBadges] = useState<Badge[]>([
    {
      id: 1,
      name: '첫 걸음',
      icon: '👣',
      description: '첫 번째 다짐 작성',
      earned: false,
      progress: 0,
      target: 1,
      rarity: 'common'
    },
    {
      id: 2,
      name: '꾸준이',
      icon: '🔥',
      description: '7일 연속 실행 달성',
      earned: false,
      progress: 0,
      target: 7,
      rarity: 'common'
    },
    {
      id: 3,
      name: '실행왕',
      icon: '🏆',
      description: '30일 연속 실행 달성',
      earned: false,
      progress: 0,
      target: 30,
      rarity: 'epic'
    },
    {
      id: 4,
      name: '완주왕',
      icon: '👑',
      description: '5개 훈련 코스 완료',
      earned: false,
      progress: 0,
      target: 5,
      rarity: 'epic'
    },
    {
      id: 5,
      name: '다짐 마스터',
      icon: '📝',
      description: '100개 다짐 작성',
      earned: false,
      progress: 0,
      target: 100,
      rarity: 'rare'
    },
    {
      id: 6,
      name: '토크룸 탐험가',
      icon: '🚀',
      description: '10개 토크룸 참여',
      earned: false,
      progress: 0,
      target: 10,
      rarity: 'legendary'
    }
  ]);

  // 레벨 계산 (경험치 = 다짐 수 * 10 + 완료 수 * 20 + 연속일 * 5)
  const calculateLevel = (totalPromises: number, completedPromises: number, streak: number) => {
    const exp = totalPromises * 10 + completedPromises * 20 + streak * 5;
    // 레벨업에 필요한 경험치: 100, 200, 300, ... (레벨 * 100)
    let level = 1;
    let expNeeded = 100;
    let remainingExp = exp;

    while (remainingExp >= expNeeded) {
      remainingExp -= expNeeded;
      level++;
      expNeeded = level * 100;
    }

    return {
      level,
      currentExp: remainingExp,
      nextLevelExp: expNeeded,
      totalExp: exp
    };
  };

  // 배지 달성 여부 계산
  const calculateBadges = (
    totalPromises: number,
    streak: number,
    completedTrainings: number,
    totalTalkrooms: number
  ) => {
    setBadges(prev => prev.map(badge => {
      switch (badge.id) {
        case 1: // 첫 걸음
          return {
            ...badge,
            earned: totalPromises >= 1,
            progress: Math.min(totalPromises, 1),
            earnedDate: totalPromises >= 1 ? new Date().toISOString().split('T')[0] : undefined
          };
        case 2: // 꾸준이 (7일 연속)
          return {
            ...badge,
            earned: streak >= 7,
            progress: Math.min(streak, 7),
            earnedDate: streak >= 7 ? new Date().toISOString().split('T')[0] : undefined
          };
        case 3: // 실행왕 (30일 연속)
          return {
            ...badge,
            earned: streak >= 30,
            progress: Math.min(streak, 30),
            earnedDate: streak >= 30 ? new Date().toISOString().split('T')[0] : undefined
          };
        case 4: // 완주왕 (5개 훈련)
          return {
            ...badge,
            earned: completedTrainings >= 5,
            progress: Math.min(completedTrainings, 5),
            earnedDate: completedTrainings >= 5 ? new Date().toISOString().split('T')[0] : undefined
          };
        case 5: // 다짐 마스터 (100개 다짐)
          return {
            ...badge,
            earned: totalPromises >= 100,
            progress: Math.min(totalPromises, 100),
            earnedDate: totalPromises >= 100 ? new Date().toISOString().split('T')[0] : undefined
          };
        case 6: // 토크룸 탐험가 (10개 참여)
          return {
            ...badge,
            earned: totalTalkrooms >= 10,
            progress: Math.min(totalTalkrooms, 10),
            earnedDate: totalTalkrooms >= 10 ? new Date().toISOString().split('T')[0] : undefined
          };
        default:
          return badge;
      }
    }));
  };

  // 주간 실행 패턴 (7일간) - 실제 데이터
  const [weeklyPattern, setWeeklyPattern] = useState<WeeklyDay[]>([]);

  const StatCard: React.FC<StatCardProps> = ({ title, value, unit, color, icon: Icon, trend }) => (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-3 h-3 ${color}`} />
        {trend && (
          <span className={`text-xs px-1 py-0.5 rounded ${
            trend > 0 ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-sm font-medium text-gray-900">{value}<span className="text-xs text-gray-400 ml-1">{unit}</span></div>
      <div className="text-xs text-gray-500">{title}</div>
    </div>
  );

  const BadgeCard: React.FC<BadgeCardProps> = ({ badge }) => (
    <div
      className={`relative p-2 rounded-lg border cursor-pointer transition-all hover:border-gray-300 ${
        badge.earned
          ? 'bg-white border-gray-200'
          : 'bg-gray-50 border-gray-100 opacity-60'
      }`}
      onClick={() => setShowBadgeDetail(badge)}
    >
      <div className="text-center">
        <div className={`text-lg mb-1 ${badge.earned ? 'text-gray-900' : 'text-gray-400'}`}>
          {badge.icon}
        </div>
        <div className="font-medium text-xs text-gray-900">{badge.name}</div>
        {badge.earned ? (
          <div className="text-xs text-gray-500 mt-1">완료</div>
        ) : (
          <div className="text-xs text-gray-500 mt-1">
            {badge.progress}/{badge.target}
            <div className="w-full bg-gray-200 rounded-full h-0.5 mt-1">
              <div
                className="bg-gray-400 h-0.5 rounded-full"
                style={{ width: `${badge.progress && badge.target ? (badge.progress / badge.target) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold">프로필</h1>
            <p className="text-sm text-muted-foreground">나의 실행 여정과 성취</p>
          </header>
          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
            <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 mb-4">로그인이 필요합니다.</p>
            <a href="/auth" className="inline-block px-4 py-2 bg-black text-white rounded-lg text-sm">
              로그인하기
            </a>
          </div>
        </div>
      </main>
    );
  }

  // 로딩 중
  if (isLoading) {
    return (
      <main className="min-h-screen bg-white pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold">프로필</h1>
            <p className="text-sm text-muted-foreground">나의 실행 여정과 성취</p>
          </header>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
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
          <h1 className="text-2xl font-semibold">프로필</h1>
          <p className="text-sm text-muted-foreground">나의 실행 여정과 성취</p>
        </header>

        <div className="space-y-4">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-700">
              {userProfile.profileImage ? (
                <img src={userProfile.profileImage} alt="프로필" className="w-full h-full rounded-full object-cover" />
              ) : (
                userProfile.name[0]
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-medium text-gray-900">{userProfile.name}</h2>
                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-600">Lv.{userProfile.level}</span>
              </div>
              <p className="text-xs text-gray-500">{userProfile.bio}</p>
            </div>
            <button
              onClick={openEditProfile}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          </div>
          
          {/* 경험치 바 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>경험치</span>
              <span>{userProfile.currentExp}/{userProfile.nextLevelExp}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div 
                className="bg-black h-1 rounded-full transition-all"
                style={{ width: `${(userProfile.currentExp / userProfile.nextLevelExp) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg p-1 flex border border-gray-200">
          {[
            { id: 'dashboard', label: '대시보드' },
            { id: 'achievements', label: '성취' },
            { id: 'insights', label: '분석' },
            { id: 'settings', label: '설정' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 대시보드 탭 */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3">
            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard 
                title="실행률" 
                value={coreStats.executionRate} 
                unit="%" 
                color="text-gray-600" 
                icon={Target}
                trend={5}
              />
              <StatCard 
                title="완주율" 
                value={coreStats.completionRate} 
                unit="%" 
                color="text-gray-600" 
                icon={Trophy}
                trend={8}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatCard 
                title="연속 달성" 
                value={coreStats.streak} 
                unit="일" 
                color="text-gray-600" 
                icon={Flame}
                trend={2}
              />
              <StatCard 
                title="레벨" 
                value={coreStats.level} 
                unit="" 
                color="text-gray-600" 
                icon={Star}
              />
            </div>

            {/* 이번 주 실행 패턴 */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 text-xs">이번 주 실행 패턴</h3>
              <div className="grid grid-cols-7 gap-1">
                {weeklyPattern.map(day => (
                  <div key={day.day} className="text-center">
                    <div className="text-xs text-gray-400 mb-1">{day.day}</div>
                    <div className="h-8 bg-gray-50 rounded flex flex-col items-center justify-end p-1 relative">
                      <div 
                        className={`w-full rounded ${
                          day.rate >= 80 ? 'bg-gray-900' : 
                          day.rate >= 60 ? 'bg-gray-600' : 
                          day.rate >= 40 ? 'bg-gray-400' : 'bg-gray-200'
                        } transition-all`}
                        style={{ height: `${day.rate}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{day.rate}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 카테고리별 성과 */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 text-xs">카테고리별 성과</h3>
              <div className="space-y-2">
                {Object.entries(detailedStats.categories).map(([key, data]) => {
                  const icons: Record<string, LucideIcon> = {
                    exercise: Dumbbell,
                    reading: BookOpen,
                    meditation: Brain,
                    learning: TrendingUp
                  };
                  const Icon = icons[key];
                  const names: Record<string, string> = {
                    exercise: '운동',
                    reading: '독서',
                    meditation: '명상',
                    learning: '학습'
                  };
                  
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Icon className="w-3 h-3 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-900">{names[key]}</span>
                          <span className="text-xs text-gray-500">{data.completed}/{data.total}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1">
                          <div 
                            className="bg-gray-900 h-1 rounded-full"
                            style={{ width: `${data.rate}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-900">{data.rate}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 성취 탭 */}
        {activeTab === 'achievements' && (
          <div className="space-y-3">
            {/* 획득한 배지 */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 text-xs">배지 컬렉션</h3>
              <div className="grid grid-cols-3 gap-2">
                {badges.map(badge => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 분석 탭 */}
        {activeTab === 'insights' && (
          <div className="space-y-3">
            {/* 개인 인사이트 */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 text-xs">이번 주 분석</h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-700">잘한 점</h4>
                  <ul className="text-xs text-gray-600 space-y-1 pl-2">
                    <li>• 아침 실행률 90% (목표 대비 +10%)</li>
                    <li>• 운동 카테고리 꾸준한 실행</li>
                    <li>• 5일 연속 커뮤니티 응원 참여</li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-700">개선 포인트</h4>
                  <ul className="text-xs text-gray-600 space-y-1 pl-2">
                    <li>• 주말 실행률 저조 (50%)</li>
                    <li>• 독서 분야 도전 필요</li>
                    <li>• 저녁 리뷰 작성률 개선 필요</li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-700">다음 주 추천</h4>
                  <ul className="text-xs text-gray-600 space-y-1 pl-2">
                    <li>• 주말 특별 챌린지 참여</li>
                    <li>• 독서 관련 토크룸 참가 고려</li>
                    <li>• 저녁 알림 시간 조정 (20:00 → 21:00)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 상세 통계 */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3 text-xs">상세 통계</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-900">{detailedStats.totalPromises}</div>
                  <div className="text-xs text-gray-500">총 다짐글</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-900">{detailedStats.completedTrainings}</div>
                  <div className="text-xs text-gray-500">완료한 훈련</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-900">{detailedStats.totalTalkrooms}</div>
                  <div className="text-xs text-gray-500">참여 토크룸</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-900">{detailedStats.supportMessages.sent}</div>
                  <div className="text-xs text-gray-500">보낸 응원</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 설정 탭 */}
        {activeTab === 'settings' && (
          <div className="space-y-3">
            {/* 계정 설정 */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-3 py-2 border-b border-gray-100">
                <h3 className="font-medium text-gray-900 text-xs">계정</h3>
              </div>
              <div className="divide-y divide-gray-100">
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-900">프로필 수정</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                </button>
                
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                  onClick={() => setShowNotificationSettings(true)}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-900">알림 설정</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                </button>
                
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-900">프라이버시</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                </button>
              </div>
            </div>

            {/* 결제 및 구독 */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-3 py-2 border-b border-gray-100">
                <h3 className="font-medium text-gray-900 text-xs">결제</h3>
              </div>
              <div className="divide-y divide-gray-100">
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-900">결제 내역</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                </button>
                
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Gift className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-900">포인트</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">1,250P</span>
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                  </div>
                </button>
              </div>
            </div>

            {/* 데이터 관리 */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-3 py-2 border-b border-gray-100">
                <h3 className="font-medium text-gray-900 text-xs">데이터</h3>
              </div>
              <div className="divide-y divide-gray-100">
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Download className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-900">데이터 다운로드</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                </button>
                
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-red-600">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-3 h-3" />
                    <span className="text-xs">계정 삭제</span>
                  </div>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 배지 상세 모달 */}
        {showBadgeDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-xs">
              <div className="text-center">
                <div className={`text-3xl mb-2 ${showBadgeDetail.earned ? 'text-gray-900' : 'text-gray-400'}`}>
                  {showBadgeDetail.icon}
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">{showBadgeDetail.name}</h3>
                <p className="text-xs text-gray-600 mb-3">{showBadgeDetail.description}</p>

                {showBadgeDetail.earned ? (
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-3">
                    <div className="text-gray-700 font-medium text-xs">획득 완료</div>
                    <div className="text-xs text-gray-500">
                      {showBadgeDetail.earnedDate && new Date(showBadgeDetail.earnedDate).toLocaleDateString('ko-KR')} 달성
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-3">
                    <div className="text-gray-700 font-medium text-xs">
                      진행률: {showBadgeDetail.progress}/{showBadgeDetail.target}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div
                        className="bg-gray-900 h-1 rounded-full"
                        style={{ width: `${showBadgeDetail.progress && showBadgeDetail.target ? (showBadgeDetail.progress / showBadgeDetail.target) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowBadgeDetail(null)}
                  className="w-full bg-black text-white py-2 rounded font-medium text-xs hover:bg-gray-900"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 프로필 수정 모달 */}
        {showEditProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-xs">
              <h3 className="text-sm font-medium text-gray-900 mb-4">프로필 수정</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">이름</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                    placeholder="이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">자기소개</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
                    rows={3}
                    placeholder="자기소개를 입력하세요"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 py-2 border border-gray-200 rounded text-xs font-medium text-gray-600 hover:bg-gray-50"
                  disabled={isSaving}
                >
                  취소
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex-1 py-2 bg-black text-white rounded text-xs font-medium hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    '저장'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 알림 설정 모달 */}
        {showNotificationSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-xs">
              <h3 className="text-sm font-medium text-gray-900 mb-4">알림 설정</h3>

              <div className="space-y-4">
                {/* 아침 다짐 알림 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-900">아침 다짐 알림</span>
                    <button
                      onClick={() => setNotificationSettings(prev => ({ ...prev, morningReminder: !prev.morningReminder }))}
                      className={`w-10 h-5 rounded-full transition-colors ${notificationSettings.morningReminder ? 'bg-black' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${notificationSettings.morningReminder ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {notificationSettings.morningReminder && (
                    <input
                      type="time"
                      value={notificationSettings.morningTime}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, morningTime: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-400"
                    />
                  )}
                </div>

                {/* 저녁 성과 알림 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-900">저녁 성과 알림</span>
                    <button
                      onClick={() => setNotificationSettings(prev => ({ ...prev, eveningReminder: !prev.eveningReminder }))}
                      className={`w-10 h-5 rounded-full transition-colors ${notificationSettings.eveningReminder ? 'bg-black' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${notificationSettings.eveningReminder ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {notificationSettings.eveningReminder && (
                    <input
                      type="time"
                      value={notificationSettings.eveningTime}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, eveningTime: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-400"
                    />
                  )}
                </div>

                {/* 응원 알림 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-900">응원 알림</span>
                  <button
                    onClick={() => setNotificationSettings(prev => ({ ...prev, cheerNotification: !prev.cheerNotification }))}
                    className={`w-10 h-5 rounded-full transition-colors ${notificationSettings.cheerNotification ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${notificationSettings.cheerNotification ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* 시스템 알림 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-900">시스템 알림</span>
                  <button
                    onClick={() => setNotificationSettings(prev => ({ ...prev, systemNotification: !prev.systemNotification }))}
                    className={`w-10 h-5 rounded-full transition-colors ${notificationSettings.systemNotification ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${notificationSettings.systemNotification ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowNotificationSettings(false)}
                  className="flex-1 py-2 border border-gray-200 rounded text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveNotifications}
                  className="flex-1 py-2 bg-black text-white rounded text-xs font-medium hover:bg-gray-900"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}