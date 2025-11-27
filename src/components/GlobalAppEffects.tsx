import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function GlobalAppEffects() {
  const { toast } = useToast();

  useEffect(() => {
    const onOnline = () => toast({ title: "온라인", description: "네트워크에 다시 연결되었습니다." });
    const onOffline = () => toast({ title: "오프라인", description: "인터넷 연결이 끊어졌어요.", variant: "destructive" });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Request Notification permission once
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Global unhandled promise rejection handler
    const onUnhandled = (e: PromiseRejectionEvent) => {
      toast({ title: "오류 발생", description: "요청 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.", variant: "destructive" });
    };
    window.addEventListener('unhandledrejection', onUnhandled);

    // Lazy-load all images by default via MutationObserver
    const ensureLazy = () => {
      document.querySelectorAll('img:not([loading])').forEach((img) => {
        (img as HTMLImageElement).loading = 'lazy';
        (img as HTMLImageElement).decoding = 'async';
      });
    };
    ensureLazy();
    const observer = new MutationObserver(() => ensureLazy());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('unhandledrejection', onUnhandled);
      observer.disconnect();
    };
  }, [toast]);

  return null;
}
