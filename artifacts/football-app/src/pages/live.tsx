import { useListLiveMatches } from "@workspace/api-client-react";
import { MatchCard } from "@/components/match-card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { LivePulse } from "@/components/live-pulse";

export default function LiveMatches() {
  const { data: matches, isLoading } = useListLiveMatches();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Live Matches</h1>
        {matches && matches.length > 0 && (
          <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            <LivePulse />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : matches && matches.length > 0 ? (
          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </motion.div>
        ) : (
          <div className="py-24 text-center text-muted-foreground bg-card/50 rounded-2xl border border-border border-dashed flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl opacity-50">⚽</span>
            </div>
            <h3 className="font-medium text-foreground mb-1">No live matches</h3>
            <p className="text-sm max-w-sm mx-auto">There are no matches currently being played. Check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
