import { useListHighlights } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Eye, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export default function Highlights() {
  const { data: highlights, isLoading } = useListHighlights();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Highlights</h1>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : highlights && highlights.length > 0 ? (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {highlights.map((highlight) => (
              <motion.div
                key={highlight.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="overflow-hidden border-border bg-card cursor-pointer group h-full flex flex-col hover:border-primary/50 transition-colors">
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {/* Fallback image if thumbnailUrl is broken, we assume it works or shows alt */}
                    <img 
                      src={highlight.thumbnailUrl} 
                      alt={highlight.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground transform scale-75 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {highlight.duration}
                    </div>
                  </div>
                  
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="text-xs font-medium text-primary mb-1">{highlight.competition}</div>
                    <h3 className="font-bold text-sm line-clamp-2 leading-snug mb-3 flex-1">{highlight.title}</h3>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {highlight.views?.toLocaleString() || "0"} views
                      </span>
                      <span>{formatDistanceToNow(new Date(highlight.publishedAt), { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-24 text-center text-muted-foreground bg-card/50 rounded-2xl border border-border border-dashed">
            No highlights available right now.
          </div>
        )}
      </div>
    </div>
  );
}
