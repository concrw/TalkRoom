import { cn } from "@/lib/utils";

interface LiveBadgeProps {
  className?: string;
  small?: boolean;
  label?: string;
}

export function LiveBadge({ className, small, label = "LIVE" }: LiveBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-destructive text-destructive-foreground",
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs font-medium",
        className
      )}
      aria-label="실시간"
    >
      <span className="inline-block h-2 w-2 rounded-full bg-destructive-foreground animate-pulse" />
      {label}
    </span>
  );
}
