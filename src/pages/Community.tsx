import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Flame, Heart, Target, Award, MessageCircle,
  Book, Dumbbell, Brain, Palette, Plus,
  LucideIcon, Loader2, Users, Star
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

interface LiveStat {
  action: string;
  count: number;
  icon: LucideIcon;
  color: string;
}

type FeedPost = Tables<"feed_posts"> & {
  user_name?: string;
  liked_by_me?: boolean;
};

interface PostTypeInfo {
  label: string;
  color: string;
  icon: LucideIcon;
}

interface ReactionButtonProps {
  count: number;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

interface PostCardProps {
  post: FeedPost;
  onLike: (postId: string) => void;
  likingPostId: string | null;
}

export default function Community() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [showNewPost, setShowNewPost] = useState<boolean>(false);
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newPostType, setNewPostType] = useState<'review' | 'daily_promise' | 'training_complete'>('daily_promise');

  // DB 연동 상태
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "커뮤니티 - TALKROOM";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "익명 리뷰 피드, 훈련 후기, 일일 다짐 공유, 응원 기능 커뮤니티");
    const linkCanonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    linkCanonical.setAttribute("rel", "canonical");
    linkCanonical.setAttribute("href", `${window.location.origin}/community`);
    if (!linkCanonical.parentNode) document.head.appendChild(linkCanonical);
  }, []);

  // 피드 게시물 로드
  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("feed_posts")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      // 사용자 이름 가져오기
      const userIds = [...new Set((postsData || []).map(p => p.user_id))];
      const userNames: Record<string, string> = {};

      for (const uid of userIds) {
        const { data } = await supabase.rpc("get_public_user_profile", { _id: uid }).maybeSingle();
        if (data) userNames[uid] = data.name || `사용자-${uid.slice(0, 6)}`;
      }

      // 현재 사용자가 좋아요한 게시물 확인
      let likedPostIds: string[] = [];
      if (user?.id) {
        const { data: likesData } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id);
        likedPostIds = (likesData || []).map(l => l.post_id);
      }

      const enrichedPosts: FeedPost[] = (postsData || []).map(post => ({
        ...post,
        user_name: userNames[post.user_id] || `사용자-${post.user_id.slice(0, 6)}`,
        liked_by_me: likedPostIds.includes(post.id),
      }));

      setPosts(enrichedPosts);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
      toast({ title: "오류", description: "게시물을 불러오는 데 실패했습니다.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user?.id]);

  // 새 게시물 작성
  const handleSubmitPost = async () => {
    if (!user?.id) {
      toast({ title: "로그인 필요", description: "게시물을 작성하려면 로그인하세요.", variant: "destructive" });
      return;
    }
    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("feed_posts").insert({
        user_id: user.id,
        content: newPostContent.trim(),
        type: newPostType,
        is_public: true,
      });

      if (error) throw error;

      toast({ title: "게시 완료", description: "게시물이 공유되었습니다!" });
      setNewPostContent("");
      setShowNewPost(false);
      fetchPosts();
    } catch (err) {
      console.error("Failed to submit post:", err);
      toast({ title: "오류", description: "게시물 작성에 실패했습니다.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 좋아요 토글
  const handleLike = async (postId: string) => {
    if (!user?.id) {
      toast({ title: "로그인 필요", description: "좋아요를 하려면 로그인하세요.", variant: "destructive" });
      return;
    }

    setLikingPostId(postId);
    const post = posts.find(p => p.id === postId);
    const isLiked = post?.liked_by_me;

    try {
      if (isLiked) {
        // 좋아요 취소
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        // likes_count 감소
        await supabase
          .from("feed_posts")
          .update({ likes_count: Math.max(0, (post?.likes_count || 1) - 1) })
          .eq("id", postId);
      } else {
        // 좋아요 추가
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id,
        });

        // likes_count 증가
        await supabase
          .from("feed_posts")
          .update({ likes_count: (post?.likes_count || 0) + 1 })
          .eq("id", postId);
      }

      // 로컬 상태 업데이트
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, liked_by_me: !isLiked, likes_count: isLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 }
          : p
      ));
    } catch (err) {
      console.error("Failed to toggle like:", err);
      toast({ title: "오류", description: "좋아요 처리에 실패했습니다.", variant: "destructive" });
    } finally {
      setLikingPostId(null);
    }
  };

  // 실시간 실행 현황 (오늘 기준)
  const { data: liveStats } = useQuery({
    queryKey: ["live-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // 오늘 아침 다짐 완료한 사람 수
      const { count: morningCount } = await supabase
        .from("daily_logs")
        .select("id", { count: "exact", head: true })
        .eq("log_date", today)
        .not("morning_promise", "is", null);

      // 오늘 저녁 성과 완료한 사람 수
      const { count: eveningCount } = await supabase
        .from("daily_logs")
        .select("id", { count: "exact", head: true })
        .eq("log_date", today)
        .not("evening_review", "is", null);

      // 오늘 공유된 게시물 수
      const { count: postsCount } = await supabase
        .from("feed_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today);

      // 현재 활성 토크룸 참가자 수
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      const { data: activeRooms } = await supabase
        .from("talk_rooms")
        .select("id")
        .gte("starts_at", twoHoursAgo)
        .lte("starts_at", now.toISOString());

      let activeParticipants = 0;
      if (activeRooms && activeRooms.length > 0) {
        const roomIds = activeRooms.map(r => r.id);
        const { count } = await supabase
          .from("room_participants")
          .select("id", { count: "exact", head: true })
          .in("room_id", roomIds);
        activeParticipants = count || 0;
      }

      const stats: LiveStat[] = [
        { action: '아침 다짐', count: morningCount || 0, icon: Target, color: 'text-yellow-500' },
        { action: '저녁 성과', count: eveningCount || 0, icon: Award, color: 'text-green-500' },
        { action: '실행 공유', count: postsCount || 0, icon: MessageCircle, color: 'text-blue-500' },
        { action: '토크룸 참여', count: activeParticipants, icon: Users, color: 'text-purple-500' }
      ];

      return stats;
    },
    refetchInterval: 30000, // 30초마다 갱신
  });

  // 게시물 타입별 UI 매핑
  const getPostTypeInfo = (type: FeedPost['type']): PostTypeInfo => {
    switch (type) {
      case 'daily_promise':
        return { label: '오늘의 다짐', color: 'bg-blue-100 text-blue-700', icon: Target };
      case 'review':
        return { label: '리뷰', color: 'bg-green-100 text-green-700', icon: Award };
      case 'training_complete':
        return { label: '훈련 완료', color: 'bg-purple-100 text-purple-700', icon: Star };
      default:
        return { label: '일반', color: 'bg-gray-100 text-gray-700', icon: MessageCircle };
    }
  };

  // 상대 시간 표시
  const getRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const LikeButton: React.FC<ReactionButtonProps> = ({ count, isActive = false, onClick, disabled }) => {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
          isActive ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Heart className={`w-3 h-3 ${isActive ? 'fill-current' : ''}`} />
        <span>{count}</span>
      </button>
    );
  };

  const PostCard: React.FC<PostCardProps> = ({ post, onLike, likingPostId }) => {
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{getRelativeTime(post.created_at)}</span>
          </div>
        </div>

        {/* 작성자 */}
        <div className="text-xs text-gray-500">{post.user_name}</div>

        {/* 내용 */}
        <div className="space-y-2">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* 좋아요 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <LikeButton
            count={post.likes_count}
            isActive={post.liked_by_me}
            onClick={() => onLike(post.id)}
            disabled={likingPostId === post.id}
          />
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">커뮤니티</h1>
          <p className="text-sm text-muted-foreground">실행하는 사람들의 연결고리</p>
        </header>

        <div className="space-y-4">
        {/* 실시간 실행 현황 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4" />
            <h2 className="text-sm font-semibold">오늘의 실행 현황</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(liveStats || []).map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.action} className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
                  <Icon className="w-3 h-3" />
                  <div>
                    <div className="font-semibold text-sm">{stat.count}명</div>
                    <div className="text-xs text-blue-100">{stat.action}</div>
                  </div>
                </div>
              );
            })}
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
                  { id: 'daily_promise' as const, label: '오늘의 다짐', color: 'bg-blue-100 text-blue-700' },
                  { id: 'review' as const, label: '리뷰', color: 'bg-green-100 text-green-700' },
                  { id: 'training_complete' as const, label: '훈련 완료', color: 'bg-purple-100 text-purple-700' }
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
                placeholder="어떤 실행을 공유하시겠어요? 구체적이고 솔직하게 작성해보세요"
                className="w-full h-20 p-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                maxLength={500}
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{newPostContent.length}/500자</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowNewPost(false)}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSubmitPost}
                    disabled={isSubmitting || !newPostContent.trim()}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs disabled:opacity-50 flex items-center gap-1"
                  >
                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
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
              실행 피드 ({posts.length})
            </h3>
            <div className="text-xs text-gray-500">최신순</div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <p className="text-xs text-gray-600">게시물 불러오는 중...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
              <div className="text-gray-400 mb-2">📭</div>
              <p className="text-xs text-gray-600">아직 게시물이 없습니다.</p>
              <p className="text-xs text-gray-500 mt-1">첫 번째 실행을 공유해보세요!</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} onLike={handleLike} likingPostId={likingPostId} />
            ))
          )}
        </div>

        </div>
      </div>
    </main>
  );
}