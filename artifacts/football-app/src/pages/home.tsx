import { useListLiveMatches, useListMatches, useListCompetitions } from "@workspace/api-client-react";
import { MatchCard } from "@/components/match-card";
import { MatchRow } from "@/components/match-row";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef, useEffect } from "react";
import {
  addDays, subDays, format, isToday, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isBefore, startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Trophy, CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const SPORTS = ["All", "Football", "Futsal"];
const STRIP_BEFORE = 3;
const STRIP_AFTER = 10;

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const firstDay = startOfMonth(viewMonth);
  const lastDay = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });
  // pad start — Sun=0, Mon=1 … map to Mon-first grid
  const startPad = (getDay(firstDay) + 6) % 7; // 0=Mon … 6=Sun

  return (
    <div ref={ref} className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-2xl shadow-2xl p-4 mx-4">
      {/* Month navigation */}
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

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const isSel = isSameDay(day, selected);
          const todayFlag = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => { onSelect(day); onClose(); }}
              className={cn(
                "aspect-square flex items-center justify-center rounded-xl text-xs font-semibold transition-all",
                isSel
                  ? "bg-primary text-white font-bold"
                  : todayFlag
                  ? "text-primary border border-primary/40 hover:bg-primary/10"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Quick-jump footer */}
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

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSport, setSelectedSport] = useState("All");
  const [showCalendar, setShowCalendar] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const { data: liveMatches, isLoading: liveLoading } = useListLiveMatches();
  const { data: allMatches, isLoading: matchesLoading } = useListMatches({ limit: 500 });
  const { data: competitions } = useListCompetitions();

  // Build a strip of days centered on selectedDate
  const stripDays = Array.from({ length: STRIP_BEFORE + STRIP_AFTER + 1 }, (_, i) =>
    addDays(selectedDate, i - STRIP_BEFORE)
  );

  const featuredLive = liveMatches?.find(m => m.featured) || liveMatches?.[0];

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

  const handleDaySelect = (day: Date) => {
    setSelectedDate(startOfDay(day));
    // Scroll strip to start after selection from calendar
    setTimeout(() => stripRef.current?.scrollTo({ left: 0, behavior: "smooth" }), 50);
  };

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

      {/* Date selector row: strip + calendar button */}
      <div className="relative px-4 pb-3">
        <div className="flex items-center gap-2">
          {/* Scrollable day strip */}
          <div
            ref={stripRef}
            className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-1"
          >
            {stripDays.map(day => {
              const isSel = isSameDay(day, selectedDate);
              const todayFlag = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDaySelect(day)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[64px] shrink-0 transition-all font-medium",
                    isSel
                      ? "bg-primary text-white"
                      : "bg-card text-muted-foreground hover:bg-accent"
                  )}
                >
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

          {/* Calendar picker button */}
          <button
            onClick={() => setShowCalendar(v => !v)}
            className={cn(
              "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border transition-all",
              showCalendar
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
            )}
          >
            <CalendarDays className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar dropdown */}
        {showCalendar && (
          <CalendarPicker
            selected={selectedDate}
            onSelect={handleDaySelect}
            onClose={() => setShowCalendar(false)}
          />
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
          <button
            key={sport}
            onClick={() => setSelectedSport(sport)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold shrink-0 transition-all border",
              selectedSport === sport
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            )}
          >
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
