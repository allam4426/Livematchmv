import { useListLiveMatches, useListMatches, useListCompetitions, useListActiveTournaments } from "@workspace/api-client-react";
import { MatchCard } from "@/components/match-card";
import { MatchRow } from "@/components/match-row";
import { Skeleton } from "@/components/ui/skeleton";
import { BannerSlot } from "@/components/banner-slot";
import { SpotlightCard } from "@/components/spotlight-card";
import { useState, useRef, useEffect } from "react";
import {
  addDays, format, isToday, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isBefore, startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Trophy, CalendarDays, ChevronLeft, ChevronRight, X, Layers } from "lucide-react";
import { Link } from "wouter";

const SPORTS = ["All", "Football", "Futsal"];
const STRIP_BEFORE = 3;
const STRIP_AFTER = 10;

const TOURNAMENT_STATUS: Record<string, { label: string; className: string; dot?: boolean }> = {
  live:     { label: "Live",     className: "bg-red-500/15 text-red-400 border-red-500/30", dot: true },
  ongoing:  { label: "Ongoing",  className: "bg-primary/15 text-primary border-primary/30" },
  upcoming: { label: "Upcoming", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  finished: { label: "Finished", className: "bg-muted text-muted-foreground border-border" },
};

function CalendarPicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected));
  const ref = useRef<HTMLDivElement>(null);

  const firstDay = startOfMonth(viewMonth);
  const lastDay = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startPad = (getDay(firstDay) + 6) % 7;

  return (
    <div ref={ref} className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-2xl shadow-2xl p-4 mx-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-foreground">{format(viewMonth, "MMMM yyyy")}</span>
        <button onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const isSel = isSameDay(day, selected);
          const todayFlag = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => { onSelect(day); onClose(); }}
              className={cn(
                "aspect-square flex items-center justify-center rounded-xl text-xs font-semibold transition-all",
                isSel ? "bg-primary text-white font-bold"
                  : todayFlag ? "text-primary border border-primary/40 hover:bg-primary/10"
                  : "text-foreground hover:bg-muted"
              )}>
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
        <button onClick={() => { onSelect(new Date()); onClose(); }}
          className="flex-1 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
          Today
        </button>
        <button onClick={() => { onSelect(addDays(new Date(), 1)); onClose(); }}
          className="flex-1 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
          Tomorrow
        </button>
        <button onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const FORMAT_LABELS: Record<string, string> = {
  league: "League",
  group_stage: "Group Stage",
  knockout: "Knockout",
};

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSport, setSelectedSport] = useState("All");
  const [showCalendar, setShowCalendar] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const { data: liveMatches, isLoading: liveLoading, refetch: refetchLive } = useListLiveMatches();
  const { data: allMatches, isLoading: matchesLoading, refetch: refetchMatches } = useListMatches({ limit: 500 });

  // Poll every 30 s so live scores and minutes stay current
  useEffect(() => {
    const id = setInterval(() => { refetchLive(); refetchMatches(); }, 30_000);
    return () => clearInterval(id);
  }, [refetchLive, refetchMatches]);
  const { data: competitions } = useListCompetitions();
  const { data: activeTournaments, isLoading: tournamentsLoading } = useListActiveTournaments();

  const stripDays = Array.from({ length: STRIP_BEFORE + STRIP_AFTER + 1 }, (_, i) =>
    addDays(selectedDate, i - STRIP_BEFORE)
  );

  // Spotlight: any featured match (live, scheduled, or finished)
  const spotlightMatch = allMatches?.find(m => m.featured)
    ?? liveMatches?.find(m => m.featured)
    ?? null;

  // Fallback hero: first live match (if no spotlight set)
  const featuredLive = spotlightMatch ? null : (liveMatches?.[0] ?? null);

  const filteredMatches = allMatches?.filter(m => {
    const dateMatch = isSameDay(new Date(m.kickoffAt), selectedDate);
    const sportMatch = selectedSport === "All" || m.sport?.toLowerCase() === selectedSport.toLowerCase();
    return dateMatch && sportMatch;
  });

  const groupedMatches: Record<string, typeof filteredMatches> = {};
  if (filteredMatches) {
    for (const m of filteredMatches) {
      if (!groupedMatches[m.competition]) groupedMatches[m.competition] = [];
      groupedMatches[m.competition]!.push(m);
    }
  }

  const filteredTournaments = activeTournaments?.filter(t =>
    selectedSport === "All" || t.sport?.toLowerCase() === selectedSport.toLowerCase()
  );

  const handleDaySelect = (day: Date) => {
    setSelectedDate(startOfDay(day));
    setTimeout(() => stripRef.current?.scrollTo({ left: 0, behavior: "smooth" }), 50);
  };

  return (
    <div className="pb-6">
      <BannerSlot position="top_home" />

      {/* Spotlight / Featured hero */}
      <div className="pt-4 pb-4">
        {(liveLoading || matchesLoading) ? (
          <div className="px-4"><Skeleton className="h-56 w-full rounded-2xl" /></div>
        ) : spotlightMatch ? (
          <SpotlightCard match={spotlightMatch} />
        ) : featuredLive ? (
          <div className="px-4"><MatchCard match={featuredLive} /></div>
        ) : (
          <div className="mx-4 h-40 rounded-2xl bg-card border border-border flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Trophy className="w-7 h-7 opacity-30" />
            <p className="text-sm">No live matches right now</p>
          </div>
        )}
      </div>

      {/* Date selector row: strip + calendar button */}
      <div className="relative px-4 pb-3">
        <div className="flex items-center gap-2">
          <div ref={stripRef} className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-1">
            {stripDays.map(day => {
              const isSel = isSameDay(day, selectedDate);
              const todayFlag = isToday(day);
              return (
                <button key={day.toISOString()} onClick={() => handleDaySelect(day)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[64px] shrink-0 transition-all font-medium",
                    isSel ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-accent"
                  )}>
                  <span className={cn("text-[9px] uppercase tracking-wide font-bold",
                    isSel ? "text-white/80" : "text-muted-foreground")}>
                    {todayFlag ? "TODAY" : format(day, "EEE").toUpperCase()}
                  </span>
                  <span className={cn("text-sm font-bold mt-0.5",
                    isSel ? "text-white" : "text-foreground")}>
                    {format(day, "d MMM")}
                  </span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setShowCalendar(v => !v)}
            className={cn(
              "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border transition-all",
              showCalendar
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
            )}>
            <CalendarDays className="w-5 h-5" />
          </button>
        </div>
        {showCalendar && (
          <CalendarPicker selected={selectedDate} onSelect={handleDaySelect} onClose={() => setShowCalendar(false)} />
        )}
      </div>

      {/* Selected date label (when not today) */}
      {!isToday(selectedDate) && (
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold text-muted-foreground">
            {format(selectedDate, "EEEE, d MMMM yyyy")}
            {isBefore(startOfDay(selectedDate), startOfDay(new Date())) && (
              <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-bold">Past</span>
            )}
          </p>
        </div>
      )}

      {/* Sport Filter Pills */}
      <div className="flex items-center gap-2 px-4 pb-4 overflow-x-auto hide-scrollbar">
        {SPORTS.map(sport => (
          <button key={sport} onClick={() => setSelectedSport(sport)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold shrink-0 transition-all border",
              selectedSport === sport
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            )}>
            {sport === "Football" && <span className="text-base leading-none">⚽</span>}
            {sport === "Futsal" && <span className="text-base leading-none">🥅</span>}
            {sport}
          </button>
        ))}
      </div>

      {/* Live horizontal scroll */}
      {liveMatches && liveMatches.length > 1 && (
        <div className="mb-2">
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Live Now</span>
            <a href="/live" className="text-xs font-semibold text-primary">View all</a>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-2 snap-x snap-mandatory">
            {liveMatches.map(match => (
              <div key={match.id} className="min-w-[280px] snap-center shrink-0">
                <MatchCard match={match} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tournaments section */}
      {(tournamentsLoading || (filteredTournaments && filteredTournaments.length > 0)) && (
        <div className="mb-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm font-black text-foreground tracking-tight">Tournaments</span>
            </div>
          </div>

          {tournamentsLoading ? (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-1">
              {[1,2,3].map(i => <Skeleton key={i} className="w-44 h-28 rounded-2xl shrink-0" />)}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-1 snap-x snap-mandatory">
              {filteredTournaments?.map(t => {
                const badge = TOURNAMENT_STATUS[t.matchStatus] ?? TOURNAMENT_STATUS.finished!;
                return (
                  <Link key={t.id} href={`/tournament/${t.id}`}>
                    <div className="w-44 shrink-0 snap-center bg-card border border-border rounded-2xl p-3.5 cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]">
                      <div className="flex items-start gap-2.5 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {t.logoUrl ? (
                            <img
                              src={t.logoUrl}
                              alt={t.name}
                              className="w-8 h-8 object-contain"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute("style"); }}
                            />
                          ) : null}
                          <Trophy className="w-5 h-5 text-muted-foreground" style={t.logoUrl ? { display: "none" } : undefined} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-foreground leading-tight line-clamp-2">{t.name}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5 capitalize">{t.season}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border", badge.className)}>
                          {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                          {badge.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground font-semibold">
                            {FORMAT_LABELS[t.format] ?? t.format}
                          </span>
                        </div>
                      </div>

                      {(t.liveCount ?? 0) > 0 && (
                        <p className="text-[9px] text-red-400 font-bold mt-1.5">{t.liveCount} match{(t.liveCount ?? 0) > 1 ? "es" : ""} live</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Competition Grouped Matches */}
      <div className="space-y-3 px-0">
        {matchesLoading ? (
          <div className="space-y-2 px-4">
            {[1, 2, 3].map(i => (
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
            const liveCount = matches.filter(m => m.status === "live").length;
            const upcomingCount = matches.filter(m => m.status === "scheduled").length;
            const statusLabel = liveCount > 0 ? "Live" : upcomingCount > 0 ? "Upcoming" : "Finished";
            const statusCount = liveCount > 0 ? liveCount : upcomingCount > 0 ? upcomingCount : matches.length;
            const compStat = competitions?.find(c => c.name === competition);

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
