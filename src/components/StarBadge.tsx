import { cn } from "@/lib/utils";

interface StarBadgeProps {
  rating?: number | string;
  className?: string;
  small?: boolean;
}

export function StarBadge({ rating = 4.8, className, small }: StarBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur text-foreground shadow-sm",
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs font-medium",
        className
      )}
      aria-label="별점"
    >
      <span className="text-[hsl(var(--star))]" aria-hidden>
        ★
      </span>
      {typeof rating === "number" ? rating.toFixed(1) : rating}
    </span>
  );
}
