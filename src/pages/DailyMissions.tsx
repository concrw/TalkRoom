import { useEffect } from "react";

export default function DailyMissions() {
  useEffect(() => {
    document.title = "일일 미션 - TALKROOM";
  }, []);
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-2">일일 미션</h1>
      <p className="text-muted-foreground">오늘의 훈련을 기록하세요.</p>
    </main>
  );
}
