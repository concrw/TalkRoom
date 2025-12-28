import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Smartphone, Building2, Loader2, Check, ArrowLeft } from "lucide-react";
import { loadTossPayments } from "@tosspayments/payment-sdk";

const currency = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" });

type PaymentMethod = "card" | "transfer" | "phone";

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { roomId, title } = (location.state as { roomId?: string; title?: string }) || {};

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const tossPaymentsRef = useRef<any>(null);

  // TossPayments 클라이언트 키 (실제 서비스에서는 환경 변수로 관리)
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY || "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";

  useEffect(() => {
    document.title = "결제 - TALKROOM";
  }, []);

  // TossPayments SDK 초기화
  useEffect(() => {
    const initTossPayments = async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        tossPaymentsRef.current = tossPayments;
      } catch (error) {
        console.error("Failed to load TossPayments:", error);
        toast({
          title: "결제 SDK 로드 실패",
          description: "결제 모듈을 불러올 수 없습니다. 페이지를 새로고침해주세요.",
          variant: "destructive"
        });
      }
    };
    initTossPayments();
  }, [clientKey, toast]);

  // 로그인 체크
  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true, state: { from: "/payment" } });
    }
  }, [user, navigate]);

  // roomId가 없으면 메인으로
  useEffect(() => {
    if (!roomId) {
      toast({ title: "오류", description: "결제할 토크룸 정보가 없습니다.", variant: "destructive" });
      navigate("/", { replace: true });
    }
  }, [roomId, navigate, toast]);

  // 토크룸 정보 조회
  const { data: room, isLoading: isLoadingRoom } = useQuery({
    queryKey: ["payment-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talk_rooms")
        .select("id, title, price_cents, price_currency, capacity, starts_at, training_weeks")
        .eq("id", roomId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });

  // 이미 참가 중인지 확인
  const { data: existingParticipant } = useQuery({
    queryKey: ["existing-participant", roomId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_participants")
        .select("id")
        .eq("room_id", roomId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId && !!user?.id,
  });

  const handlePayment = async () => {
    if (!user || !room || !roomId || !tossPaymentsRef.current) return;
    if (!agreed) {
      toast({ title: "동의 필요", description: "결제 약관에 동의해주세요.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      // 이미 참가 중인 경우
      if (existingParticipant) {
        toast({ title: "이미 참가 중", description: "이미 해당 토크룸에 참여하고 있습니다." });
        navigate(`/rooms/${roomId}`);
        return;
      }

      // 주문 ID 생성
      const orderId = `ORDER_${Date.now()}_${user.id.slice(0, 8)}`;
      const amount = room.price_cents / 100;

      // 결제 방법에 따른 TossPayments 결제 요청
      const paymentMethodMap = {
        card: "카드",
        transfer: "계좌이체",
        phone: "휴대폰"
      };

      await tossPaymentsRef.current.requestPayment(paymentMethod === "card" ? "카드" : paymentMethod === "transfer" ? "계좌이체" : "휴대폰", {
        amount,
        orderId,
        orderName: room.title,
        customerName: user.email?.split("@")[0] || "사용자",
        successUrl: `${window.location.origin}/payment/success?roomId=${roomId}`,
        failUrl: `${window.location.origin}/payment/fail`,
      });

      // 성공 시 successUrl로 리다이렉트되므로 여기는 실행되지 않음

    } catch (err: any) {
      console.error("Payment error:", err);
      toast({
        title: "결제 실패",
        description: err.message || "결제 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (!user || !roomId) {
    return null;
  }

  if (isLoadingRoom) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold mb-2">토크룸을 찾을 수 없습니다</h1>
        <Button onClick={() => navigate("/")}>홈으로 돌아가기</Button>
      </main>
    );
  }

  const priceWon = (room.price_cents || 0) / 100;

  return (
    <main className="min-h-screen bg-white pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 헤더 */}
        <header className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로가기
          </button>
          <h1 className="text-2xl font-semibold">결제</h1>
          <p className="text-sm text-muted-foreground">토크룸 참가비 결제</p>
        </header>

        {/* 토크룸 정보 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="font-medium mb-2">{room.title || title}</h2>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>시작일</span>
                <span>{new Date(room.starts_at).toLocaleDateString("ko-KR")}</span>
              </div>
              <div className="flex justify-between">
                <span>훈련 기간</span>
                <span>{room.training_weeks || 3}주</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 결제 수단 선택 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">결제 수단</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod("card")}
              className={`p-3 border rounded-lg flex flex-col items-center gap-1 transition-colors ${
                paymentMethod === "card"
                  ? "border-black bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <CreditCard className={`w-5 h-5 ${paymentMethod === "card" ? "text-black" : "text-gray-400"}`} />
              <span className="text-xs">카드</span>
            </button>
            <button
              onClick={() => setPaymentMethod("transfer")}
              className={`p-3 border rounded-lg flex flex-col items-center gap-1 transition-colors ${
                paymentMethod === "transfer"
                  ? "border-black bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Building2 className={`w-5 h-5 ${paymentMethod === "transfer" ? "text-black" : "text-gray-400"}`} />
              <span className="text-xs">계좌이체</span>
            </button>
            <button
              onClick={() => setPaymentMethod("phone")}
              className={`p-3 border rounded-lg flex flex-col items-center gap-1 transition-colors ${
                paymentMethod === "phone"
                  ? "border-black bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Smartphone className={`w-5 h-5 ${paymentMethod === "phone" ? "text-black" : "text-gray-400"}`} />
              <span className="text-xs">휴대폰</span>
            </button>
          </div>
        </div>

        {/* 결제 금액 */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">토크룸 참가비</span>
              <span>{currency.format(priceWon)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>총 결제 금액</span>
              <span className="text-lg">{currency.format(priceWon)}</span>
            </div>
          </CardContent>
        </Card>

        {/* 약관 동의 */}
        <div className="mb-6">
          <label className="flex items-start gap-2 cursor-pointer">
            <button
              onClick={() => setAgreed(!agreed)}
              className={`w-5 h-5 border rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                agreed ? "bg-black border-black" : "border-gray-300"
              }`}
            >
              {agreed && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className="text-sm text-gray-600">
              결제 진행에 동의합니다. 결제 완료 후 토크룸에 참가됩니다.
              환불 정책에 따라 시작일 이전까지 전액 환불이 가능합니다.
            </span>
          </label>
        </div>

        {/* 결제 버튼 */}
        <Button
          className="w-full h-12 text-base"
          onClick={handlePayment}
          disabled={isProcessing || !agreed}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              결제 처리 중...
            </>
          ) : (
            `${currency.format(priceWon)} 결제하기`
          )}
        </Button>

        {/* 안내 문구 */}
        <p className="text-xs text-center text-gray-400 mt-4">
          토스페이먼츠를 통해 안전하게 결제됩니다.
        </p>
      </div>
    </main>
  );
}
