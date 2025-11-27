import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarStackProps {
  avatars?: string[];
  size?: "sm" | "md" | "lg";
  max?: number; // max avatars to show
  className?: string;
}

const sizeMap = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-sm",
};

export function AvatarStack({ avatars = [], size = "sm", max = 5, className }: AvatarStackProps) {
  const items = avatars.slice(0, max);
  const rest = Math.max(0, avatars.length - items.length);

  return (
    <div className={cn("flex -space-x-2", className)} aria-label="참가자 아바타들">
      {items.map((src, i) => (
        <Avatar key={i} className={cn(sizeMap[size], "ring-2 ring-background shadow-sm")}> 
          <AvatarImage src={src} alt="참가자 아바타" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      ))}
      {rest > 0 && (
        <div
          className={cn(
            sizeMap[size],
            "rounded-full bg-muted text-muted-foreground ring-2 ring-background flex items-center justify-center select-none shadow-sm"
          )}
          aria-label={`외 ${rest}명`}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
