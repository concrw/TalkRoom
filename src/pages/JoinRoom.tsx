import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string | null;
  type: "text" | "cheer" | "system";
  created_at: string;
}

interface ParticipantRow {
  user_id: string;
  status: string;
  joined_at: string;
}

interface UserProfile {
  id: string;
  name: string | null;
  bio: string | null;
  level: number;
  streak_days: number;
  rating: number;
}

export default function JoinRoom() {
  const { id: roomId } = useParams();
  const { user } = useAuth();
  // const navigate = useNavigate();
  const { toast } = useToast();

  const [gateChecked, setGateChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);

  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  // Loading & pagination states
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const oldestCursorRef = useRef<string | null>(null);

  // Chat rules
  const MAX_MESSAGE_LENGTH = 500;
  const MIN_INTERVAL_MS = 3000;

  // Sending controls
  const lastSentAtRef = useRef<number>(0);
  const sendingRef = useRef<boolean>(false);
  const loadingOlderRef = useRef<boolean>(false);

  // SEO
  useEffect(() => {
    document.title = "토크룸 입장 - TALKROOM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "리뷰를 완료한 참가자만 입장 가능한 토크룸입니다.");
    const link: HTMLLinkElement = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", `${window.location.origin}/rooms/${roomId}/join`);
    if (!link.parentNode) document.head.appendChild(link);
  }, [roomId]);

  // Gate: must be participant with review_completed = true
  useEffect(() => {
    const check = async () => {
      if (!roomId || !user?.id) return;
      const { data: room, error: roomErr } = await supabase
        .from("talk_rooms")
        .select("host_id")
        .eq("id", roomId)
        .maybeSingle();
      if (roomErr) {
        toast({ title: "오류", description: roomErr.message, variant: "destructive" });
        return;
      }
      setIsHost(room?.host_id === user.id);
      setHostId(room?.host_id || null);

      const { data, error } = await supabase
        .from("room_participants")
        .select("user_id, status, joined_at, review_completed")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        // not participant
        setAllowed(false);
        setGateChecked(true);
        return;
      }
      const ok = !!data && (data as any).review_completed === true;
      setAllowed(ok || room?.host_id === user.id); // Host can always view
      setGateChecked(true);
      if (!ok && room?.host_id !== user.id) {
        toast({ title: "입장 제한", description: "리뷰 완료 후 입장할 수 있어요." });
      }
    };
    check();
  }, [roomId, user?.id, toast]);

  // Load participants + profiles
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!roomId || !user?.id) return;
      setIsLoadingParticipants(true);
      const { data, error } = await supabase
        .from("room_participants")
        .select("user_id, status, joined_at")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });
      if (error) {
        setIsLoadingParticipants(false);
        return;
      }
      setParticipants(data || []);
      const ids = Array.from(new Set((data || []).map((p) => p.user_id)));
      if (ids.length > 0) {
        const results = await Promise.all(ids.map(async (id) => {
          const { data } = await supabase.rpc("get_public_user_profile", { _id: id }).maybeSingle();
          return data;
        }));
        const map: Record<string, UserProfile> = {};
        results.filter(Boolean).forEach((u: any) => (map[u.id] = u as UserProfile));
        setProfiles(map);
      }
      setIsLoadingParticipants(false);
    };
    fetchParticipants();

    // Realtime participants updates
    const channel = supabase
      .channel(`room-${roomId}-participants`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` },
        () => {
          // Refetch lightweight
          fetchParticipants();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, user?.id]);

  // Status online/offline + welcome/join/leave system messages
  useEffect(() => {
    const setup = async () => {
      if (!allowed || !roomId || !user?.id) return;
      try {
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission().catch(() => {});
        }
        // mark online
        await supabase
          .from('room_participants')
          .update({ status: 'online' })
          .eq('room_id', roomId)
          .eq('user_id', user.id);
        // join system message (best-effort)
        await supabase.from('chat_messages').insert({
          session_id: roomId,
          user_id: user.id,
          type: 'system',
          message: `${(profiles[user.id]?.name || `사용자-${(user.id || '').slice(0,6)}`)} 님이 입장했습니다.`,
        });
        toast({ title: '환영합니다!', description: '즐거운 대화를 나눠보세요.' });
      } catch {}
    };
    setup();

    const onLeave = async () => {
      if (!roomId || !user?.id) return;
      try {
        await supabase
          .from('room_participants')
          .update({ status: 'offline' })
          .eq('room_id', roomId)
          .eq('user_id', user.id);
        await supabase.from('chat_messages').insert({
          session_id: roomId,
          user_id: user.id,
          type: 'system',
          message: `${(profiles[user.id]?.name || `사용자-${(user.id || '').slice(0,6)}`)} 님이 퇴장했습니다.`,
        });
      } catch {}
    };

    if (!allowed || !roomId || !user?.id) return;
    const handleBeforeUnload = () => { onLeave(); };
    const handlePageHide = () => { onLeave(); };
    const handleVisibility = () => { if (document.visibilityState === 'hidden') onLeave(); };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibility);
      onLeave();
    };
  }, [allowed, roomId, user?.id]);

  // Chat: initial load + pagination + realtime
  useEffect(() => {
    if (!roomId) return;
    const PAGE_SIZE = 30;

    const loadLatest = async () => {
      setIsLoadingMessages(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,user_id,message,type,created_at")
        .eq("session_id", roomId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (error) { setIsLoadingMessages(false); return; }
      const batch = (data || []) as ChatMessage[];
      batch.reverse();
      setMessages(batch);
      setHasMore(batch.length === PAGE_SIZE);
      oldestCursorRef.current = batch.length ? batch[0].created_at : null;
      setIsLoadingMessages(false);
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    };

    const loadOlder = async () => {
      if (loadingOlderRef.current || !hasMore || !oldestCursorRef.current) return;
      loadingOlderRef.current = true;
      const prevHeight = listRef.current?.scrollHeight || 0;
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,user_id,message,type,created_at")
        .eq("session_id", roomId)
        .lt("created_at", oldestCursorRef.current)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (error) { loadingOlderRef.current = false; return; }
      const older = (data || []) as ChatMessage[];
      const olderAsc = older.reverse();
      setMessages((prev) => {
        const merged = [...olderAsc, ...prev];
        return merged;
      });
      setHasMore(older.length === PAGE_SIZE);
      oldestCursorRef.current = olderAsc.length ? olderAsc[0].created_at : oldestCursorRef.current;
      setTimeout(() => {
        if (listRef.current) {
          const newHeight = listRef.current.scrollHeight;
          listRef.current.scrollTop = newHeight - prevHeight;
        }
        loadingOlderRef.current = false;
      }, 0);
    };

    loadLatest();

    const channel = supabase
      .channel(`room-${roomId}-chat`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => [...prev, row]);
          const mine = row.user_id === user?.id;
          if (!mine) {
            if (row.type === 'cheer') {
              toast({ title: '응원 도착', description: `${nameOf(row.user_id)}: ${row.message}` });
            }
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(row.type === 'cheer' ? '응원 도착' : '새 메시지', {
                  body: row.type === 'cheer' ? `${row.message}` : `${nameOf(row.user_id)}: ${row.message}`,
                });
              } catch {}
            }
          }
        }
      )
      .subscribe();

    const onScroll = () => {
      const el = listRef.current;
      if (!el) return;
      if (el.scrollTop <= 0) {
        loadOlder();
      }
    };
    const el = listRef.current;
    el?.addEventListener('scroll', onScroll);

    return () => {
      supabase.removeChannel(channel);
      el?.removeEventListener('scroll', onScroll);
    };
  }, [roomId, user?.id, toast]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const nameOf = (uid: string) => profiles[uid]?.name || `사용자-${uid.slice(0, 6)}`;
  const initials = (uid: string) => (nameOf(uid) || "").slice(0, 2).toUpperCase();

  const sendMessage = async (content: string, type: ChatMessage["type"]) => {
    if (!user?.id || !roomId) return;
    const text = (content || "").trim();

    // Validation
    if (!text) return;
    if (type === 'text' && text.length > MAX_MESSAGE_LENGTH) {
      toast({ title: '메시지가 너무 길어요', description: `최대 ${MAX_MESSAGE_LENGTH}자까지 가능합니다.`, variant: 'destructive' });
      return;
    }
    const now = Date.now();
    if (now - lastSentAtRef.current < MIN_INTERVAL_MS) {
      toast({ title: '전송 간격 제한', description: '잠시 후 다시 시도해주세요.', variant: 'destructive' });
      return;
    }
    if (sendingRef.current) return;

    sendingRef.current = true;

    const tryInsert = async (attempt = 1): Promise<boolean> => {
      const { error } = await supabase.from("chat_messages").insert({
        session_id: roomId,
        user_id: user.id,
        type,
        message: text,
      });
      if (!error) return true;
      if (attempt >= 3) {
        toast({ title: "전송 실패", description: "네트워크 문제로 전송에 실패했어요. 다시 시도해주세요.", variant: "destructive" });
        return false;
      }
      await new Promise((r) => setTimeout(r, attempt * 500));
      return tryInsert(attempt + 1);
    };

    const ok = await tryInsert();
    sendingRef.current = false;

    if (ok) {
      lastSentAtRef.current = Date.now();
      if (type === 'text') setInput("");
    }
  };

  const emojiList = ["👏", "💪", "🔥", "❤️"];

  const headerInfo = useMemo(() => {
    const total = participants.length;
    return { total };
  }, [participants]);

  if (!gateChecked) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center text-muted-foreground">검증 중…</main>
    );
  }

  if (!allowed && !isHost) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold mb-2">입장 불가</h1>
        <p className="text-muted-foreground">리뷰 완료 후 입장 가능합니다.</p>
        {roomId && (
          <div className="mt-4 flex gap-2">
            <Button asChild variant="secondary"><Link to={`/review/${roomId}`}>리뷰 작성하기</Link></Button>
            <Button asChild><Link to={`/rooms/${roomId}`}>상세 보기로 이동</Link></Button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">토크룸</h1>
          <p className="text-sm text-muted-foreground">참가자 {headerInfo.total}명</p>
        </div>
        <div className="flex items-center gap-2">
          {hostId && <Badge variant="outline">방장: {nameOf(hostId)}</Badge>}
          <Button asChild variant="secondary"><Link to={`/rooms/${roomId}`}>방 정보</Link></Button>
          {isHost && <Button asChild><Link to={`/edit-room/${roomId}`}>설정</Link></Button>}
        </div>
      </header>

      <section className="grid grid-rows-[auto_1fr_auto] gap-4 md:grid-cols-[280px_1fr] md:grid-rows-[auto_1fr]">
        {/* Participants */}
        <Card className="p-3 h-[60vh] md:h-[70vh] md:row-span-2">
          <h2 className="font-medium mb-2">참가자</h2>
          <ScrollArea className="h-[calc(100%-2rem)]">
            <div className="space-y-2 pr-2">
              {isLoadingParticipants ? (
                <>
                  <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div>
                  <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/4" /></div></div>
                </>
              ) : participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">아직 참가자가 없습니다.</p>
              ) : (
                participants.map((p) => (
                  <button
                    key={p.user_id}
                    className="w-full flex items-center gap-3 rounded-md border p-2 hover:bg-accent text-left"
                    onClick={() => profiles[p.user_id] && setSelectedProfile(profiles[p.user_id])}
                  >
                    <Avatar className="h-8 w-8"><AvatarFallback>{initials(p.user_id)}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium flex items-center gap-2">
                        {nameOf(p.user_id)}
                        {hostId === p.user_id && <Badge variant="secondary">방장</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.status === 'online' ? '온라인' : '오프라인'}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat area */}
        <Card className="p-3 flex flex-col h-[60vh] md:h-[70vh]">
          <h2 className="font-medium mb-2">채팅</h2>
          <div ref={listRef} className="flex-1 overflow-auto rounded-md border p-3 bg-background" aria-live="polite">
            <div className="space-y-3">
              {isLoadingMessages ? (
                <>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-12 w-4/5" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-2/5 ml-auto" />
                    <Skeleton className="h-12 w-3/5 ml-auto" />
                  </div>
                </>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
              ) : (
                messages.map((m) => {
                  const mine = m.user_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && (
                        <Avatar className="h-7 w-7 mr-2 self-end">
                          <AvatarFallback>{initials(m.user_id)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[75%] rounded-md px-3 py-2 text-sm border ${mine ? 'bg-accent' : ''}`}>
                        <div className="text-xs text-muted-foreground mb-0.5">
                          {m.type === 'system' ? '시스템' : nameOf(m.user_id)} · {new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {m.type === 'cheer' ? <span className="text-lg" aria-label="emoji">{m.message}</span> : m.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {emojiList.map((e) => (
              <button key={e} onClick={() => sendMessage(e, 'cheer')} className="h-9 w-9 rounded-md border hover:bg-accent" aria-label={`응원 ${e}`}>
                <span className="text-lg leading-none">{e}</span>
              </button>
            ))}
            <Input
              value={input}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input, 'text');
                }
              }}
              placeholder={`메시지를 입력하세요 (최대 ${MAX_MESSAGE_LENGTH}자)`}
            />
            <Button onClick={() => sendMessage(input, 'text')}>전송</Button>
          </div>
        </Card>
      </section>

      {/* Profile dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={(o) => !o && setSelectedProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로필</DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10"><AvatarFallback>{(selectedProfile.name || '').slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                <div>
                  <div className="font-medium">{selectedProfile.name || '이름 없음'}</div>
                  <div className="text-xs text-muted-foreground">레벨 {selectedProfile.level} · 연속 {selectedProfile.streak_days}일 · 평점 {Number(selectedProfile.rating).toFixed(1)}</div>
                </div>
              </div>
              {selectedProfile.bio && <p className="text-sm whitespace-pre-wrap">{selectedProfile.bio}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
