import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/AvatarStack";
import { LiveBadge } from "@/components/LiveBadge";
import { StarBadge } from "@/components/StarBadge";
import { cn } from "@/lib/utils";

interface HeroLiveRoomCardProps {
  id: string;
  title: string;
  capacity?: number | null;
  participantsCount?: number; // optional, fallback to 0
  avatars?: string[];
  hostName?: string | null;
  mediaUrl?: string | null;
  className?: string;
}

export function HeroLiveRoomCard({
  id,
  title,
  capacity,
  participantsCount = 0,
  avatars = [],
  hostName,
  mediaUrl,
  className,
}: HeroLiveRoomCardProps) {
  return (
    <Link to={`/rooms/${id}`} className={cn("block", className)}>
        <Card className="relative overflow-hidden rounded-2xl shadow-lg border bg-card hover:shadow-xl transition-shadow">
          <div className="absolute top-3 left-3 z-10">
            <LiveBadge />
          </div>
          <div className="absolute top-3 right-3 z-10">
            <StarBadge rating={4.9} />
          </div>
          <div className="relative aspect-video w-full">
            {mediaUrl ? (
              <>
                <img
                  src={mediaUrl}
                  alt={`${title} 커버 이미지`}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />
              </>
            ) : (
              <div className="h-full w-full bg-muted" />
            )}

            {/* Overlay content */}
            <div className="absolute inset-0 flex flex-col justify-end p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="sr-only">실시간</span>
                {typeof capacity === "number" && (
                  <span className="ml-auto text-xs md:text-sm px-3 py-1 rounded-full bg-background/80 backdrop-blur">
                    {participantsCount}/{capacity}명
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold leading-tight line-clamp-2">
                {title}
              </h2>
              <div className="mt-2 text-sm md:text-base text-muted-foreground line-clamp-2">
                {hostName ? `호스트 ${hostName}와 함께 대화 중` : "함께 이야기 나누어 보세요."}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <AvatarStack avatars={avatars} size="md" />
                {typeof capacity === "number" && (
                  <span className="px-3 py-1 rounded-full bg-background/80 backdrop-blur text-xs md:text-sm">
                    {participantsCount}/{capacity}명 참여 중
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* SEO-friendly hidden content for screen readers */}
          <CardContent className="sr-only">
            <h2>{title}</h2>
            <div>호스트 {hostName ? `· ${hostName}` : ""}</div>
            {typeof capacity === "number" && (
              <span aria-label="현재 참가자 수">
                {participantsCount}/{capacity}명
              </span>
            )}
          </CardContent>
        </Card>
    </Link>
  );
}
