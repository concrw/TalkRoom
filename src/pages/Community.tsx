import { useState, useEffect } from "react";
import { 
  Flame, Heart, Target, Award, MessageCircle, Clock, 
  TrendingUp, Users, Zap, Coffee, Book, Dumbbell, 
  Brain, Palette, ChevronDown, Filter, Plus, 
  ThumbsUp, Send, Eye, EyeOff, MoreHorizontal,
  Sunrise, Sun, Sunset, Moon, Star, LucideIcon
} from 'lucide-react';

interface LiveStat {
  action: string;
  count: number;
  icon: LucideIcon;
  color: string;
}

interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
}

interface Timeframe {
  id: string;
  name: string;
  icon: LucideIcon;
}

interface Achievement {
  type: string;
  days: number;
  badge: string;
}

interface Post {
  id: number;
  type: 'promise' | 'live' | 'review' | 'achievement' | 'support';
  content: string;
  category: string;
  timeframe: string;
  keywords: string[];
  reactions: {
    heart: number;
    fire: number;
    clap: number;
    muscle: number;
  };
  comments: number;
  time: string;
  isLive: boolean;
  achievement: Achievement | null;
}

interface PostTypeInfo {
  label: string;
  color: string;
  icon: LucideIcon;
}

interface ReactionButtonProps {
  type: 'heart' | 'fire' | 'clap' | 'muscle';
  count: number;
  isActive?: boolean;
}

interface PostCardProps {
  post: Post;
}

export default function Community() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all');
  const [showNewPost, setShowNewPost] = useState<boolean>(false);
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newPostType, setNewPostType] = useState<string>('promise');

  useEffect(() => {
    document.title = "커뮤니티 - TALKROOM";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "익명 리뷰 피드, 훈련 후기, 일일 다짐 공유, 응원 기능 커뮤니티");
    const linkCanonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    linkCanonical.setAttribute("rel", "canonical");
    linkCanonical.setAttribute("href", `${window.location.origin}/community`);
    if (!linkCanonical.parentNode) document.head.appendChild(linkCanonical);
  }, []);

  // 실시간 실행 현황 (더미 데이터 추가)
  const liveStats: LiveStat[] = [
    { action: '운동', count: 23, icon: Dumbbell, color: 'text-red-500' },
    { action: '독서', count: 15, icon: Book, color: 'text-blue-500' },
    { action: '명상', count: 9, icon: Brain, color: 'text-purple-500' },
    { action: '창작', count: 6, icon: Palette, color: 'text-green-500' }
  ];

  // 카테고리 필터
  const categories: Category[] = [
    { id: 'all', name: '전체', icon: Target },
    { id: 'exercise', name: '운동', icon: Dumbbell },
    { id: 'reading', name: '독서', icon: Book },
    { id: 'meditation', name: '명상', icon: Brain },
    { id: 'learning', name: '학습', icon: TrendingUp },
    { id: 'creative', name: '창작', icon: Palette }
  ];

  // 시간대 필터
  const timeframes: Timeframe[] = [
    { id: 'all', name: '전체', icon: Clock },
    { id: 'morning', name: '아침', icon: Sunrise },
    { id: 'afternoon', name: '오후', icon: Sun },
    { id: 'evening', name: '저녁', icon: Sunset },
    { id: 'night', name: '새벽', icon: Moon }
  ];

  // 커뮤니티 게시물 (더미 데이터 확장)
  const posts: Post[] = [
    {
      id: 1,
      type: 'promise',
      content: '오늘도 새벽 6시에 일어나서 30분 독서하기! 벌써 5일째 성공 중이에요 🔥',
      category: 'reading',
      timeframe: 'morning',
      keywords: ['독서', '새벽', '습관'],
      reactions: { heart: 24, fire: 12, clap: 8, muscle: 5 },
      comments: 3,
      time: '1시간 전',
      isLive: false,
      achievement: null
    },
    {
      id: 2,
      type: 'live',
      content: '지금 헬스장에서 운동 중! 스쿼트 3세트 완료 💪 다들 화이팅!',
      category: 'exercise',
      timeframe: 'afternoon',
      keywords: ['운동', '헬스', '스쿼트'],
      reactions: { heart: 18, fire: 15, clap: 6, muscle: 20 },
      comments: 7,
      time: '진행 중',
      isLive: true,
      achievement: null
    },
    {
      id: 3,
      type: 'review',
      content: '오늘 명상 20분 완료! 처음엔 잡념이 많았는데 점점 집중이 되더라구요. 마음이 한결 편해졌어요 🧘‍♀️',
      category: 'meditation',
      timeframe: 'evening',
      keywords: ['명상', '집중', '마음챙김'],
      reactions: { heart: 31, fire: 8, clap: 15, muscle: 3 },
      comments: 5,
      time: '2시간 전',
      isLive: false,
      achievement: null
    },
    {
      id: 4,
      type: 'achievement',
      content: '드디어 7일 연속 새벽 기상 달성! 🎉 처음엔 힘들었는데 이제 자연스럽게 일어나게 되네요. 다음 목표는 14일 도전!',
      category: 'exercise',
      timeframe: 'morning',
      keywords: ['새벽기상', '습관', '완주'],
      reactions: { heart: 45, fire: 28, clap: 32, muscle: 12 },
      comments: 12,
      time: '3시간 전',
      isLive: false,
      achievement: { type: '연속 달성', days: 7, badge: '🏆' }
    },
    {
      id: 5,
      type: 'support',
      content: '운동 시작하려는데 동기부여가 안 돼요 😭 어떻게 시작하면 좋을까요?',
      category: 'exercise',
      timeframe: 'afternoon',
      keywords: ['운동', '시작', '동기부여'],
      reactions: { heart: 12, fire: 5, clap: 3, muscle: 8 },
      comments: 15,
      time: '30분 전',
      isLive: false,
      achievement: null
    },
    {
      id: 6,
      type: 'live',
      content: '영어 공부 중! 오늘은 영단어 50개 외우기 도전 📚 지금 25개째...',
      category: 'learning',
      timeframe: 'evening',
      keywords: ['영어', '단어', '공부'],
      reactions: { heart: 14, fire: 9, clap: 7, muscle: 4 },
      comments: 2,
      time: '진행 중',
      isLive: true,
      achievement: null
    },
    {
      id: 7,
      type: 'promise',
      content: '매일 10분씩 그림 그리기 시작! 창작하는 즐거움을 되찾고 싶어요 🎨',
      category: 'creative',
      timeframe: 'afternoon',
      keywords: ['그림', '창작', '취미'],
      reactions: { heart: 19, fire: 6, clap: 11, muscle: 2 },
      comments: 4,
      time: '45분 전',
      isLive: false,
      achievement: null
    },
    {
      id: 8,
      type: 'achievement',
      content: '14일 연속 독서 완주! 📖 한 달 목표까지 절반 왔네요. 독서량이 확실히 늘었어요.',
      category: 'reading',
      timeframe: 'evening',
      keywords: ['독서', '완주', '습관'],
      reactions: { heart: 38, fire: 22, clap: 28, muscle: 8 },
      comments: 9,
      time: '4시간 전',
      isLive: false,
      achievement: { type: '연속 달성', days: 14, badge: '📚' }
    }
  ];

  const getPostTypeInfo = (type: Post['type']): PostTypeInfo => {
    switch (type) {
      case 'promise':
        return { label: '아침 다짐', color: 'bg-blue-100 text-blue-700', icon: Target };
      case 'live':
        return { label: '실시간 실행', color: 'bg-red-100 text-red-700', icon: Zap };
      case 'review':
        return { label: '저녁 성과', color: 'bg-green-100 text-green-700', icon: Award };
      case 'achievement':
        return { label: '완주 인증', color: 'bg-purple-100 text-purple-700', icon: Star };
      case 'support':
        return { label: '응원 요청', color: 'bg-yellow-100 text-yellow-700', icon: MessageCircle };
      default:
        return { label: '일반', color: 'bg-gray-100 text-gray-700', icon: MessageCircle };
    }
  };

  const ReactionButton: React.FC<ReactionButtonProps> = ({ type, count, isActive = false }) => {
    const icons = {
      heart: { icon: Heart, color: 'text-red-500' },
      fire: { icon: Flame, color: 'text-orange-500' },
      clap: { icon: ThumbsUp, color: 'text-blue-500' },
      muscle: { icon: Dumbbell, color: 'text-green-500' }
    };

    const { icon: Icon, color } = icons[type] || icons.heart;

    return (
      <button className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
        isActive ? `${color} bg-opacity-20` : 'text-gray-500 hover:text-gray-700'
      }`}>
        <Icon className="w-3 h-3" />
        <span>{count}</span>
      </button>
    );
  };

  const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const typeInfo = getPostTypeInfo(post.type);
    const TypeIcon = typeInfo.icon;

    return (
      <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-2">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
              <TypeIcon className="w-2.5 h-2.5" />
              <span>{typeInfo.label}</span>
            </div>
            {post.isLive && (
              <div className="flex items-center gap-1 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                LIVE
              </div>
            )}
            {post.achievement && (
              <div className="flex items-center gap-1 bg-purple-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold">
                <span>{post.achievement.badge}</span>
                <span>{post.achievement.type}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{post.time}</span>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="space-y-2">
          <p className="text-sm text-gray-800">{post.content}</p>
          
          {/* 키워드 */}
          <div className="flex flex-wrap gap-1">
            {post.keywords.map(keyword => (
              <span key={keyword} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                #{keyword}
              </span>
            ))}
          </div>
        </div>

        {/* 반응 및 댓글 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <ReactionButton type="heart" count={post.reactions.heart} />
            <ReactionButton type="fire" count={post.reactions.fire} />
            <ReactionButton type="clap" count={post.reactions.clap} />
            <ReactionButton type="muscle" count={post.reactions.muscle} />
          </div>
          <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
            <MessageCircle className="w-3 h-3" />
            <span className="text-xs">{post.comments}</span>
          </button>
        </div>
      </div>
    );
  };

  const filteredPosts = posts.filter(post => {
    if (selectedCategory !== 'all' && post.category !== selectedCategory) return false;
    if (selectedTimeframe !== 'all' && post.timeframe !== selectedTimeframe) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="p-3">
          <h1 className="text-lg font-semibold text-gray-900">커뮤니티</h1>
          <p className="text-xs text-gray-600">실행하는 사람들의 연결고리</p>
        </div>
      </header>

      <div className="p-3 space-y-4 pb-20">
        {/* 실시간 실행 현황 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4" />
            <h2 className="text-sm font-semibold">지금 이 순간 실행 중</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {liveStats.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.action} className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
                  <Icon className="w-3 h-3" />
                  <div>
                    <div className="font-semibold text-sm">{stat.count}명</div>
                    <div className="text-xs text-blue-100">{stat.action} 중</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg p-1 flex border border-gray-200">
          {[
            { id: 'all', label: '전체' },
            { id: 'interests', label: '내 관심사' },
            { id: 'live', label: '실시간' },
            { id: 'popular', label: '인기' }
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

        {/* 필터 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-3 h-3 text-gray-600" />
            <span className="text-xs font-medium text-gray-900">필터</span>
          </div>
          
          {/* 카테고리 필터 */}
          <div className="space-y-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">카테고리</div>
              <div className="flex flex-wrap gap-1">
                {categories.map(category => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      <span>{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 시간대 필터 */}
            <div>
              <div className="text-xs text-gray-500 mb-1">시간대</div>
              <div className="flex flex-wrap gap-1">
                {timeframes.map(timeframe => {
                  const Icon = timeframe.icon;
                  return (
                    <button
                      key={timeframe.id}
                      onClick={() => setSelectedTimeframe(timeframe.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                        selectedTimeframe === timeframe.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      <span>{timeframe.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 새 게시물 작성 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <button
            onClick={() => setShowNewPost(!showNewPost)}
            className="w-full flex items-center gap-2 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">새로운 실행 공유하기</span>
          </button>

          {showNewPost && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-1">
                {[
                  { id: 'promise', label: '다짐', color: 'bg-blue-100 text-blue-700' },
                  { id: 'live', label: '실행중', color: 'bg-red-100 text-red-700' },
                  { id: 'review', label: '완료', color: 'bg-green-100 text-green-700' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setNewPostType(type.id)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      newPostType === type.id ? type.color : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="어떤 실행을 공유하시겠어요? 구체적이고 솔직하게 작성해보세요 💪"
                className="w-full h-20 p-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                maxLength={200}
              />
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{newPostContent.length}/200자</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowNewPost(false)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      if (newPostContent.trim()) {
                        alert('게시물이 공유되었습니다! 🎉');
                        setNewPostContent('');
                        setShowNewPost(false);
                      }
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs"
                  >
                    공유하기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 게시물 피드 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              실행 피드 ({filteredPosts.length})
            </h3>
            <div className="text-xs text-gray-500">
              {selectedCategory !== 'all' && `${categories.find(c => c.id === selectedCategory)?.name} · `}
              {selectedTimeframe !== 'all' && `${timeframes.find(t => t.id === selectedTimeframe)?.name} · `}
              최신순
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
              <div className="text-gray-400 mb-2">📭</div>
              <p className="text-xs text-gray-600">해당 조건의 게시물이 없습니다.</p>
              <p className="text-xs text-gray-500 mt-1">필터를 조정하거나 새로운 실행을 공유해보세요!</p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>

        {/* 특별 이벤트 섹션 */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4" />
            <h3 className="text-sm font-semibold">이번 주 챌린지</h3>
          </div>
          <p className="text-xs text-yellow-100 mb-3">
            함께 도전해요! "매일 아침 6시 기상" 챌린지
          </p>
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <div className="font-semibold">참여자 127명</div>
              <div className="text-yellow-200">3일 남음</div>
            </div>
            <button className="bg-white text-orange-600 px-3 py-1 rounded-lg font-medium hover:bg-yellow-50 text-xs">
              참여하기
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}