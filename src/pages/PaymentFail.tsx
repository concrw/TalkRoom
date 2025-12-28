import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get("code");
  const message = searchParams.get("message");

  useEffect(() => {
    document.title = "결제 실패 - TALKROOM";
  }, []);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h1 className="text-2xl font-semibold">결제 실패</h1>
        <div className="space-y-2">
          <p className="text-gray-600">
            {message || "결제 처리 중 문제가 발생했습니다."}
          </p>
          {code && (
            <p className="text-sm text-gray-500">오류 코드: {code}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => navigate(-1)}
            className="w-full"
          >
            다시 시도하기
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full"
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </main>
  );
}
