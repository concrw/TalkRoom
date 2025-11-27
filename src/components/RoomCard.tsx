import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/AvatarStack";
import { LiveBadge } from "@/components/LiveBadge";
import { cn } from "@/lib/utils";

interface RoomCardProps {
  id: string;
  title: string;
  keywords?: string[];
  starts_at?: string;
  capacity?: number | null;
  price_cents?: number | null;
  media_type?: string | null;
  avatars?: string[];
  live?: boolean;
  to?: string; // href
  className?: string;
}

const currency = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" });

export function RoomCard({ id, title, keywords = [], starts_at, capacity, price_cents, media_type, avatars = [], live, to = `/rooms/${id}` , className }: RoomCardProps) {
  const startLabel = starts_at ? new Date(starts_at).toLocaleString("ko-KR") : "";
  const priceLabel = typeof price_cents === "number" ? currency.format(price_cents / 100) : "무료";

  return (
    <Link to={to} className={cn("block hover-scale", className)}>
      <Card className="overflow-hidden rounded-2xl shadow-md">
        <div className="relative aspect-video bg-muted flex items-center justify-center text-muted-foreground">
          <span className="text-xs tracking-wide">{media_type ? media_type.toUpperCase() : "MEDIA"}</span>
          {live && <LiveBadge className="absolute top-2 left-2" />}
        </div>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-base font-semibold line-clamp-2">{title}</h3>
          <div className="flex flex-wrap gap-1.5">
            {keywords.slice(0, 4).map((k) => (
              <Badge key={k} className="bg-foreground text-background">#{k}</Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{startLabel}</span>
            <span>{priceLabel}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <AvatarStack avatars={avatars} size="sm" />
            {typeof capacity === "number" && (
              <span className="text-xs text-muted-foreground">정원 {capacity}명</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
