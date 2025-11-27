import { useState, useEffect } from "react";
import { 
  User, Award, TrendingUp, Target, Calendar, Clock, 
  BookOpen, Dumbbell, Brain, Palette, Settings, 
  Bell, Lock, CreditCard, Download, Trash2, Star,
  Flame, Heart, Trophy, Crown, Sunrise, MessageCircle,
  ChevronRight, Edit3, BarChart3, PieChart, LineChart,
  Gift, Zap, Coffee, Moon, CheckCircle, AlertCircle,
  LucideIcon
} from 'lucide-react';

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

interface Challenge {
  id: number;
  title: string;
  description: string;
  progress: number;
  target: number;
  deadline: string;
  reward: string;
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

interface ChallengeCardProps {
  challenge: Challenge;
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('week');
  const [showBadgeDetail, setShowBadgeDetail] = useState<Badge | null>(null);

  useEffect(() => {
    document.title = "프로필 - TALKROOM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "나의 실행 여정과 성취를 확인하세요.");
  }, []);

  // 사용자 기본 정보
  const [userProfile] = useState<UserProfile>({
    name: '김하늘',
    nickname: 'SkyRunner',
    bio: '실행력으로 인생을 바꾸는 중 💪',
    level: 12,
    currentExp: 1850,
    nextLevelExp: 2000,
    joinDate: '2024-03-15',
    consecutiveDays: 7,
    profileImage: null
  });

  // 핵심 지표
  const [coreStats] = useState<CoreStats>({
    executionRate: 85,
    completionRate: 92,
    streak: 7,
    level: 12,
    totalExperience: 1850
  });

  // 상세 통계
  const [detailedStats] = useState<DetailedStats>({
    totalPromises: 45,
    completedPromises: 38,
    totalTrainings: 12,
    completedTrainings: 11,
    totalTalkrooms: 8,
    supportMessages: { sent: 89, received: 67 },
    categories: {
      exercise: { completed: 15, total: 18, rate: 83 },
      reading: { completed: 12, total: 14, rate: 86 },
      meditation: { completed: 8, total: 10, rate: 80 },
      learning: { completed: 3, total: 5, rate: 60 }
    }
  });

  // 획득한 배지 (더미 데이터 확장)
  const [badges] = useState<Badge[]>([
    { 
      id: 1, 
      name: '얼리버드', 
      icon: '🌅', 
      description: '새벽 6시 이전 실행 7일 달성',
      earned: true,
      earnedDate: '2024-08-10',
      rarity: 'rare'
    },
    { 
      id: 2, 
      name: '꾸준이', 
      icon: '🔥', 
      description: '7일 연속 실행 달성',
      earned: true,
      earnedDate: '2024-08-15',
      rarity: 'common'
    },
    { 
      id: 3, 
      name: '완주왕', 
      icon: '👑', 
      description: '5개 훈련 코스 완료',
      earned: true,
      earnedDate: '2024-08-01',
      rarity: 'epic'
    },
    { 
      id: 4, 
      name: '응원천사', 
      icon: '💪', 
      description: '100개 응원 메시지 전송',
      earned: false,
      progress: 89,
      target: 100,
      rarity: 'rare'
    },
    { 
      id: 5, 
      name: '챌린저', 
      icon: '⚡', 
      description: '어려운 목표 10개 도전',
      earned: false,
      progress: 7,
      target: 10,
      rarity: 'legendary'
    },
    { 
      id: 6, 
      name: '독서광', 
      icon: '📚', 
      description: '30일 연속 독서 실행',
      earned: false,
      progress: 12,
      target: 30,
      rarity: 'epic'
    }
  ]);

  // 진행 중인 도전
  const [ongoingChallenges] = useState<Challenge[]>([
    {
      id: 1,
      title: '14일 연속 실행',
      description: '매일 다짐과 실행을 이어가기',
      progress: 7,
      target: 14,
      deadline: '2024-08-29',
      reward: '특별 배지 + 500 포인트'
    },
    {
      id: 2,
      title: '월 100시간 실행',
      description: '한 달 동안 총 100시간 실행하기',
      progress: 67,
      target: 100,
      deadline: '2024-08-31',
      reward: '월간 챔피언 인증서'
    },
    {
      id: 3,
      title: '5개 분야 마스터',
      description: '5개 다른 분야에서 각각 5회 이상 실행',
      progress: 3,
      target: 5,
      deadline: '2024-09-15',
      reward: '마스터 타이틀 + 프리미엄 혜택'
    }
  ]);

  // 주간 실행 패턴 (7일간)
  const [weeklyPattern] = useState<WeeklyDay[]>([
    { day: '월', rate: 90, mood: '😊' },
    { day: '화', rate: 85, mood: '😌' },
    { day: '수', rate: 95, mood: '🔥' },
    { day: '목', rate: 80, mood: '😐' },
    { day: '금', rate: 70, mood: '😅' },
    { day: '토', rate: 40, mood: '😴' },
    { day: '일', rate: 60, mood: '🤔' }
  ]);

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

  const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge }) => (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900 text-xs">{challenge.title}</h4>
          <p className="text-xs text-gray-500 mt-1">{challenge.description}</p>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {Math.ceil((new Date(challenge.deadline).getTime() - new Date().getTime()) / (1000*60*60*24))}일 남음
        </span>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">진행률</span>
          <span className="font-medium text-gray-900">
            {challenge.progress}/{challenge.target} ({Math.round((challenge.progress / challenge.target) * 100)}%)
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1">
          <div 
            className="bg-black h-1 rounded-full transition-all"
            style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-400">
          완료 시: {challenge.reward}
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-3">
          <h1 className="text-lg font-semibold text-gray-900">프로필</h1>
          <p className="text-xs text-gray-600">나의 실행 여정과 성취</p>
        </div>
      </header>

      <div className="p-3 space-y-4 pb-20">
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
            <button className="p-1 text-gray-400 hover:text-gray-600">
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

            {/* 진행 중인 도전 */}
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 text-xs">진행 중인 도전</h3>
              {ongoingChallenges.map(challenge => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
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
                
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
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
      </div>
    </main>
  );
}