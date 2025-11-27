import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { RoomCard } from "@/components/RoomCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface Room {
  id: string;
  title: string;
  media_type: string;
  media_url?: string;
  keywords: string[];
  starts_at: string;
  capacity: number;
  price_cents: number;
  price_currency: string;
  is_public: boolean;
}

interface RoomSectionProps {
  title: string;
  icon?: string;
  rooms: Room[];
  viewAllLink?: string;
  className?: string;
}

export function RoomSection({ title, icon, rooms, viewAllLink, className }: RoomSectionProps) {
  if (!rooms.length) return null;

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </h2>
        {viewAllLink && (
          <Link 
            to={viewAllLink}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="relative">
        <Carousel
          opts={{
            align: "start",
            slidesToScroll: 1,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {rooms.map((room) => (
              <CarouselItem key={room.id} className="pl-2 md:pl-4 basis-[85%] sm:basis-1/2 lg:basis-[40%]">
                <RoomCard
                  id={room.id}
                  title={room.title}
                  keywords={(room.keywords || []).slice(0, 3)}
                  starts_at={room.starts_at}
                  capacity={room.capacity}
                  price_cents={room.price_cents}
                  media_type={room.media_type}
                  avatars={[]}
                  live={new Date(room.starts_at) <= new Date()}
                  to={`/rooms/${room.id}`}
                  className="h-full"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-12" />
          <CarouselNext className="hidden sm:flex -right-12" />
        </Carousel>
      </div>
    </section>
  );
}