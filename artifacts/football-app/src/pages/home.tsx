import { useListLiveMatches, useListMatches, useListCompetitions } from "@workspace/api-client-react";
import { MatchCard } from "@/components/match-card";
import { MatchRow } from "@/components/match-row";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { addDays, subDays, format, isToday, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

const DAYS = [-2, -1, 0, 1, 2];
const SPORTS = ["All", "Football", "Futsal"];

export default function Home() {
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selectedSport, setSelectedSport] = useState("All");

  const { data: liveMatches, isLoading: liveLoading } = useListLiveMatches();
  const { data: allMatches, isLoading: matchesLoading } = useListMatches({ limit: 200 });
  const { data: competitions } = useListCompetitions();

  const today = new Date();
  const selectedDate = selectedDayOffset < 0
    ? subDays(today, Math.abs(selectedDayOffset))
    : addDays(today, selectedDayOffset);

  const featuredLive = liveMatches?.find((m) => m.featured) || liveMatches?.[0];

  // Filter by selected date AND sport
  const filteredMatches = allMatches?.filter((m) => {
    const matchDate = new Date(m.kickoffAt);
    const dateMatch = isSameDay(matchDate, selectedDate);
    const sportMatch =
      selectedSport === "All" ||
      m.sport?.toLowerCase() === selectedSport.toLowerCase();
    return dateMatch && sportMatch;
  });

  // Group by competition
  const groupedMatches: Record<string, typeof filteredMatches> = {};
  if (filteredMatches) {
    for (const m of filteredMatches) {
      if (!groupedMatches[m.competition]) groupedMatches[m.competition] = [];
      groupedMatches[m.competition]!.push(m);
    }
  }

  return (
    <div className="pb-6">
      {/* Featured Live Match */}
      <div className="px-4 pt-4 pb-4">
        {liveLoading ? (
          <Skeleton className="h-52 w-full rounded-2xl" />
        ) : featuredLive ? (
          <MatchCard match={featuredLive} />
        ) : (
          <div className="h-40 rounded-2xl bg-card border border-border flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Trophy className="w-7 h-7 opacity-30" />
            <p className="text-sm">No live matches right now</p>
          </div>
        )}
      </div>

      {/* Date Selector */}
      <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar px-4 pb-3">
        {DAYS.map((offset) => {
          const date = offset < 0 ? subDays(today, Math.abs(offset)) : addDays(today, offset);
          const isSelected = offset === selectedDayOffset;
          const todayFlag = isToday(date);
          return (
            <button
              key={offset}
              onClick={() => setSelectedDayOffset(offset)}
              data-testid={`date-tab-${offset}`}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl px-4 py-2 min-w-[68px] shrink-0 transition-all font-medium",
                isSelected
                  ? "bg-primary text-white"
                  : "bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              <span className={cn("text-[10px] uppercase tracking-wide", isSelected ? "text-white/80" : "text-muted-foreground")}>
                {todayFlag ? "TODAY" : format(date, "EEE").toUpperCase()}
              </span>
              <span className={cn("text-sm font-bold mt-0.5", isSelected ? "text-white" : "text-foreground")}>
                {format(date, "d MMM")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sport Filter Pills */}
      <div className="flex items-center gap-2 px-4 pb-4 overflow-x-auto hide-scrollbar">
        {SPORTS.map((sport) => {
          const isSelected = selectedSport === sport;
          return (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              data-testid={`sport-filter-${sport.toLowerCase()}`}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold shrink-0 transition-all border",
                isSelected
                  ? "bg-primary text-white border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              {sport === "Football" && <span className="text-base leading-none">⚽</span>}
              {sport === "Futsal" && <span className="text-base leading-none">🥅</span>}
              {sport}
            </button>
          );
        })}
      </div>

      {/* Live horizontal scroll */}
      {liveMatches && liveMatches.length > 1 && (
        <div className="mb-2">
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Live Now</span>
            <a href="/live" className="text-xs font-semibold text-primary">View all</a>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-2 snap-x snap-mandatory">
            {liveMatches.map((match) => (
              <div key={match.id} className="min-w-[280px] snap-center shrink-0">
                <MatchCard match={match} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competition Grouped Matches */}
      <div className="space-y-3 px-0">
        {matchesLoading ? (
          <div className="space-y-2 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded" />
                <Skeleton className="h-14 w-full rounded" />
              </div>
            ))}
          </div>
        ) : Object.keys(groupedMatches).length > 0 ? (
          Object.entries(groupedMatches).map(([competition, matches]) => {
            if (!matches) return null;
            const liveCount = matches.filter((m) => m.status === "live").length;
            const upcomingCount = matches.filter((m) => m.status === "scheduled").length;
            const statusLabel = liveCount > 0 ? "Live" : upcomingCount > 0 ? "Upcoming" : "Finished";
            const statusCount = liveCount > 0 ? liveCount : upcomingCount > 0 ? upcomingCount : matches.length;
            const compStat = competitions?.find((c) => c.name === competition);

            return (
              <div key={competition} className="bg-card rounded-xl overflow-hidden mx-4 border border-border">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {compStat?.logoUrl ? (
                        <img src={compStat.logoUrl} alt={competition} className="w-5 h-5 object-contain" />
                      ) : (
                        <span className="text-[9px] font-black text-muted-foreground">{competition.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-foreground">{competition}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      liveCount > 0
                        ? "bg-red-500/15 text-red-400 border border-red-500/25"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {statusLabel}
                    </span>
                    <span className={cn(
                      "text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                      liveCount > 0 ? "bg-red-500 text-white" : "bg-primary text-white"
                    )}>
                      {statusCount}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-border/50">
                  {matches.map((match, i) => (
                    <MatchRow key={match.id} match={match} index={i} />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center text-muted-foreground px-4">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No matches on {format(selectedDate, "EEEE, d MMMM")}</p>
            <p className="text-xs mt-1 opacity-60">Try another date or check back later</p>
          </div>
        )}
      </div>
    </div>
  );
}
