import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceChatProps {
  roomId: string;
  userId: string;
}

export default function VoiceChat({ roomId, userId }: VoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [peers, setPeers] = useState<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Supabase Realtime 채널 설정
    const channel = supabase.channel(`voice-${roomId}`);

    // 다른 사용자의 시그널 수신
    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.to === userId) {
          await handleOffer(payload.from, payload.offer);
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.to === userId) {
          await handleAnswer(payload.from, payload.answer);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.to === userId) {
          await handleIceCandidate(payload.from, payload.candidate);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      disconnectVoice();
    };
  }, [roomId, userId]);

  const connectVoice = async () => {
    try {
      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setIsConnected(true);

      toast({
        title: '음성 연결 완료',
        description: '음성 채팅에 참여했습니다.',
      });

      // 기존 참가자들과 연결
      await createPeerConnections();
    } catch (error) {
      console.error('마이크 접근 오류:', error);
      toast({
        title: '마이크 접근 실패',
        description: '마이크 권한을 허용해주세요.',
        variant: 'destructive',
      });
    }
  };

  const disconnectVoice = () => {
    // 모든 연결 종료
    peers.forEach((peer) => peer.close());
    setPeers(new Map());

    // 스트림 정리
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setIsConnected(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const createPeerConnections = async () => {
    // 룸의 다른 참가자들 조회
    const { data: participants } = await supabase
      .from('room_participants')
      .select('user_id')
      .eq('room_id', roomId)
      .neq('user_id', userId);

    if (!participants) return;

    // 각 참가자와 peer connection 생성
    for (const participant of participants) {
      await createPeerConnection(participant.user_id, true);
    }
  };

  const createPeerConnection = async (peerId: string, isInitiator: boolean) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // 로컬 스트림 추가
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // 원격 스트림 수신
    peerConnection.ontrack = (event) => {
      const remoteAudio = new Audio();
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.play();
    };

    // ICE candidate 처리
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', peerId, {
          candidate: event.candidate,
        });
      }
    };

    peers.set(peerId, peerConnection);
    setPeers(new Map(peers));

    // Initiator는 offer 생성
    if (isInitiator) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      sendSignal('offer', peerId, { offer });
    }
  };

  const handleOffer = async (peerId: string, offer: RTCSessionDescriptionInit) => {
    let peerConnection = peers.get(peerId);

    if (!peerConnection) {
      await createPeerConnection(peerId, false);
      peerConnection = peers.get(peerId);
    }

    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    sendSignal('answer', peerId, { answer });
  };

  const handleAnswer = async (peerId: string, answer: RTCSessionDescriptionInit) => {
    const peerConnection = peers.get(peerId);
    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleIceCandidate = async (peerId: string, candidate: RTCIceCandidateInit) => {
    const peerConnection = peers.get(peerId);
    if (!peerConnection) return;

    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const sendSignal = async (event: string, to: string, data: any) => {
    const channel = supabase.channel(`voice-${roomId}`);
    await channel.send({
      type: 'broadcast',
      event,
      payload: {
        from: userId,
        to,
        ...data,
      },
    });
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-gray-100 rounded-lg">
      {!isConnected ? (
        <Button onClick={connectVoice} className="flex items-center gap-2">
          <Mic className="w-4 h-4" />
          음성 참여
        </Button>
      ) : (
        <>
          <Button
            onClick={toggleMute}
            variant={isMuted ? 'destructive' : 'default'}
            className="flex items-center gap-2"
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isMuted ? '음소거 해제' : '음소거'}
          </Button>
          <Button
            onClick={disconnectVoice}
            variant="outline"
            className="flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            나가기
          </Button>
          <span className="text-sm text-gray-600">
            {peers.size}명과 연결됨
          </span>
        </>
      )}
    </div>
  );
}
