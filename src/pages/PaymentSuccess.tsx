import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  const roomId = searchParams.get("roomId");
  const orderId = searchParams.get("orderId");
  const paymentKey = searchParams.get("paymentKey");
  const amount = searchParams.get("amount");

  useEffect(() => {
    const processPayment = async () => {
      if (!user || !roomId) {
        navigate("/", { replace: true });
        return;
      }

      try {
        // 토크룸 정보 조회
        const { data: room, error: roomError } = await supabase
          .from("talk_rooms")
          .select("title")
          .eq("id", roomId)
          .maybeSingle();

        if (roomError) throw roomError;

        // 참가자로 등록
        const { error: participantError } = await supabase
          .from("room_participants")
          .insert({
            room_id: roomId,
            user_id: user.id,
            status: "active",
            review_completed: false,
            course_completed: false,
          });

        if (participantError && participantError.code !== "23505") {
          throw participantError;
        }

        // 알림 생성
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "system",
          title: "결제 완료",
          message: `${room?.title || "토크룸"} 결제가 완료되었습니다.`,
          is_read: false,
        });

        setIsProcessing(false);

        // 3초 후 토크룸 상세 페이지로 이동
        setTimeout(() => {
          navigate(`/rooms/${roomId}`, { replace: true });
        }, 3000);

      } catch (err: any) {
        console.error("Payment processing error:", err);
        toast({
          title: "오류",
          description: "결제 처리 중 문제가 발생했습니다.",
          variant: "destructive"
        });
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [user, roomId, orderId, paymentKey, amount, navigate, toast]);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {isProcessing ? (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto" />
            <h1 className="text-2xl font-semibold">결제 처리 중</h1>
            <p className="text-gray-600">잠시만 기다려주세요...</p>
          </>
        ) : (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-semibold">결제 완료!</h1>
            <p className="text-gray-600">
              토크룸 참가가 완료되었습니다.
              <br />
              잠시 후 토크룸으로 이동합니다.
            </p>
            <Button
              onClick={() => navigate(`/rooms/${roomId}`, { replace: true })}
              className="w-full"
            >
              지금 이동하기
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
