import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Home, Search, Users, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const { data: unreadCount = 0, refetch } = useQuery({
    queryKey: ["notifications-unread", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      if (error) throw error;
      return count || 0;
    },
  });

  useEffect(() => {
    refetch();
  }, [location.pathname, refetch]);

  const isActive = (path: string) => location.pathname === path;

  const itemCls = (active: boolean) => [
    "flex-1 flex items-center justify-center py-3",
    active ? "text-gray-900" : "text-gray-400",
  ].join(" ");

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur z-40">
      <div className="mx-auto max-w-lg grid grid-cols-5">
        <Link to="/" className={itemCls(isActive("/"))} aria-label="홈">
          <Home className="h-4 w-4" />
        </Link>
        
        <Link to="/explore" className={itemCls(isActive("/explore"))} aria-label="탐색">
          <Search className="h-4 w-4" />
        </Link>
        
        <Link to="/schedule" className={itemCls(isActive("/schedule"))} aria-label="일정">
          <div className="relative">
            <CalendarDays className="h-4 w-4" />
            {unreadCount > 0 && (
              <span
                aria-label={`읽지 않은 알림 ${unreadCount}개`}
                className="absolute -top-1 -right-1 h-3 min-w-3 px-1 rounded-full bg-red-500 text-white text-[8px] leading-3 text-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </Link>
        
        <Link to="/community" className={itemCls(isActive("/community"))} aria-label="커뮤니티">
          <Users className="h-4 w-4" />
        </Link>
        
        <Link to="/profile" className={itemCls(isActive("/profile"))} aria-label="프로필">
          <User className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  );
}