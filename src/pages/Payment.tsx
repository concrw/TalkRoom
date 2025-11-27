import { useEffect } from "react";

export default function Payment() {
  useEffect(() => {
    document.title = "결제 - TALKROOM";
  }, []);
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-2">결제</h1>
      <p className="text-muted-foreground">결제는 로그인 후 진행됩니다.</p>
    </main>
  );
}
