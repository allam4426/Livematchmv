import { useListLiveMatches, useListMatches } from "@workspace/api-client-react";
import { MatchCard } from "@/components/match-card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Trophy } from "lucide-react";

export default function Home() {
  const { data: liveMatches, isLoading: liveLoading } = useListLiveMatches();
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "finished">("all");
  const { data: matches, isLoading: matchesLoading } = useListMatches({ status: statusFilter });

  const featuredLive = liveMatches?.find(m => m.featured) || liveMatches?.[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Featured Match Hero */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Featured Match</h2>
        {liveLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : featuredLive ? (
          <MatchCard match={featuredLive} featured />
        ) : (
          <div className="h-48 rounded-2xl bg-card border border-border flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <Trophy className="h-8 w-8 mb-2 opacity-50" />
            <p>No featured live matches right now.</p>
          </div>
        )}
      </section>

      {/* Horizontal Scroll Live Matches */}
      {liveMatches && liveMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Now</h2>
            <Button variant="link" size="sm" className="text-primary h-auto p-0" asChild>
              <a href="/live">View All</a>
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {liveMatches.map((match) => (
              <div key={match.id} className="min-w-[280px] snap-center shrink-0">
                <MatchCard match={match} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Matches List */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today's Matches</h2>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 border border-border">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="scheduled">Upcoming</TabsTrigger>
              <TabsTrigger value="finished">Finished</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-3">
          {matchesLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          ) : matches && matches.length > 0 ? (
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
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </motion.div>
          ) : (
            <div className="py-12 text-center text-muted-foreground bg-card/50 rounded-xl border border-border border-dashed">
              No matches found for the selected filter.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
