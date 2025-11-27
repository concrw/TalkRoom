import { Link } from "react-router-dom";
import { StarBadge } from "@/components/StarBadge";
import { cn } from "@/lib/utils";

interface RecommendedRoomCardProps {
  id: string;
  title: string;
  mediaUrl?: string | null;
  startsAt?: string | null;
  capacity?: number | null;
  className?: string;
}

export function RecommendedRoomCard({
  id,
  title,
  mediaUrl,
  startsAt,
  capacity,
  className,
}: RecommendedRoomCardProps) {
  const timeLabel = startsAt
    ? new Date(startsAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : undefined;

  return (
    <Link
      to={`/rooms/${id}`}
      className={cn(
        "group block rounded-2xl overflow-hidden shadow-lg border bg-card hover:shadow-xl transition-shadow snap-start",
        className
      )}
      aria-label={`${title} 방으로 이동`}
    >
      <div className="relative aspect-[4/3] w-full">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={`${title} 커버 이미지`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 h-full w-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/10 via-transparent to-transparent" />
        <div className="absolute top-3 right-3 z-10">
          <StarBadge rating={4.6} />
        </div>
      </div>

      <div className="px-3 py-3">
        <h3 className="text-base font-semibold tracking-tight line-clamp-1">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {timeLabel ? `${timeLabel}` : "시간 미정"}
          {typeof capacity === "number" ? ` · 정원 ${capacity}명` : ""}
        </p>
      </div>
    </Link>
  );
}
