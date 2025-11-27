import { useEffect, useState } from "react";

export default function OfflineNotice() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-screen-md">
        <div className="m-2 rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-sm shadow-sm" role="status" aria-live="polite">
          오프라인 상태입니다. 네트워크를 확인해주세요.
        </div>
      </div>
    </div>
  );
}
