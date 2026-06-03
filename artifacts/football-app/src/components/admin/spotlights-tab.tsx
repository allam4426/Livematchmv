import { useState } from "react";
import {
  useListMatches, useUpdateMatch,
  getListMatchesQueryKey, type Match,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TeamLogo } from "@/components/team-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, StarOff, Zap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Sport = "all" | "football" | "futsal";

const STATUS_ORDER = { live: 0, scheduled: 1, finished: 2, postponed: 3 };

function StatusBadge({ status, minute }: { status: string; minute?: string | null }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full">
        <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
        {minute && minute !== "HT" && minute !== "PSO" ? `${minute}'` : minute === "HT" ? "HT" : minute === "PSO" ? "PSO" : "Live"}
      </span>
    );
  }
  if (status === "scheduled") {
    return <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-full">Scheduled</span>;
  }
  if (status === "finished") {
    return <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 border border-border px-2 py-0.5 rounded-full">FT</span>;
  }
  return <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/25 px-2 py-0.5 rounded-full capitalize">{status}</span>;
}

function CurrentSpotlight({ match }: { match: Match }) {
  return (
    <div className="spotlight-gradient rounded-2xl border border-white/10 p-4 relative overflow-hidden mb-5">
      <div className="flex items-center gap-1.5 mb-3">
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">Current Spotlight</span>
        <StatusBadge status={match.status} minute={match.minute} />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamLogo url={match.homeTeam.logoUrl} name={match.homeTeam.name} shortName={match.homeTeam.shortName} className="w-8 h-8 shrink-0" />
          <span className="text-sm font-bold text-white truncate">{match.homeTeam.shortName}</span>
        </div>
        <div className="text-center shrink-0">
          {(match.status === "live" || match.status === "finished") ? (
            <span className="text-xl font-black text-white tabular-nums">{match.homeScore}–{match.awayScore}</span>
          ) : (
            <span className="text-sm font-black text-white/40">VS</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-bold text-white truncate text-right">{match.awayTeam.shortName}</span>
          <TeamLogo url={match.awayTeam.logoUrl} name={match.awayTeam.name} shortName={match.awayTeam.shortName} className="w-8 h-8 shrink-0" />
        </div>
      </div>
      <p className="text-[10px] text-white/40 mt-2 text-center">{match.competition} · {format(new Date(match.kickoffAt), "d MMM yyyy, HH:mm")}</p>
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
    </div>
  );
}

function MatchRow({
  match,
  isCurrent,
  onSet,
  onUnset,
  isPending,
}: {
  match: Match;
  isCurrent: boolean;
  onSet: () => void;
  onUnset: () => void;
  isPending: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-all",
      isCurrent
        ? "bg-amber-500/8 border-amber-500/30"
        : "bg-card border-border hover:border-border/80"
    )}>
      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge status={match.status} minute={match.minute} />
          {match.matchGroup && (
            <span className="text-[9px] font-semibold text-muted-foreground/60 bg-muted/40 border border-border rounded px-1.5 py-0.5">
              {match.matchGroup}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TeamLogo url={match.homeTeam.logoUrl} name={match.homeTeam.name} shortName={match.homeTeam.shortName} className="w-5 h-5 shrink-0" />
          <span className="text-[13px] font-bold text-foreground">{match.homeTeam.shortName}</span>
          {(match.status === "live" || match.status === "finished") ? (
            <span className="text-[13px] font-black text-muted-foreground tabular-nums mx-0.5">{match.homeScore}–{match.awayScore}</span>
          ) : (
            <span className="text-[11px] text-muted-foreground/50 mx-0.5">vs</span>
          )}
          <span className="text-[13px] font-bold text-foreground">{match.awayTeam.shortName}</span>
          <TeamLogo url={match.awayTeam.logoUrl} name={match.awayTeam.name} shortName={match.awayTeam.shortName} className="w-5 h-5 shrink-0" />
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{match.competition} · {format(new Date(match.kickoffAt), "d MMM, HH:mm")}</p>
      </div>

      {/* Action button */}
      {isCurrent ? (
        <button
          onClick={onUnset}
          disabled={isPending}
          title="Remove spotlight"
          className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 px-3 py-2 rounded-xl transition-all disabled:opacity-40 shrink-0"
        >
          <Star className="w-4 h-4 fill-amber-400" />
          Active
        </button>
      ) : (
        <button
          onClick={onSet}
          disabled={isPending}
          title="Set as spotlight"
          className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-muted/40 border border-border hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 px-3 py-2 rounded-xl transition-all disabled:opacity-40 shrink-0"
        >
          <StarOff className="w-4 h-4" />
          Set
        </button>
      )}
    </div>
  );
}

export function SpotlightsTab() {
  const [sport, setSport] = useState<Sport>("all");
  const queryClient = useQueryClient();
  const updateMatch = useUpdateMatch();

  const { data: matches, isLoading } = useListMatches(
    { sport: sport === "all" ? undefined : sport },
    { query: { queryKey: [...getListMatchesQueryKey(), sport] } }
  );

  const currentSpotlight = matches?.find(m => m.featured);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey() });
    setPendingId(null);
  };

  const handleSet = (match: Match) => {
    setPendingId(match.id);
    const tasks: Promise<unknown>[] = [];
    if (currentSpotlight && currentSpotlight.id !== match.id) {
      tasks.push(
        new Promise(res =>
          updateMatch.mutate(
            { id: currentSpotlight.id, data: { featured: false } },
            { onSuccess: res, onError: res }
          )
        )
      );
    }
    Promise.all(tasks).then(() => {
      updateMatch.mutate(
        { id: match.id, data: { featured: true } },
        { onSuccess: invalidate, onError: () => setPendingId(null) }
      );
    });
  };

  const handleUnset = (match: Match) => {
    setPendingId(match.id);
    updateMatch.mutate(
      { id: match.id, data: { featured: false } },
      { onSuccess: invalidate, onError: () => setPendingId(null) }
    );
  };

  const sorted = [...(matches ?? [])].sort(
    (a, b) => (STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] ?? 9) - (STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] ?? 9)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pt-1">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-black text-foreground">Spotlights</p>
          <p className="text-[10px] text-muted-foreground">Choose which match appears as the featured spotlight on the home page</p>
        </div>
      </div>

      {/* Current spotlight preview */}
      {currentSpotlight && <CurrentSpotlight match={currentSpotlight} />}

      {!currentSpotlight && !isLoading && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-8 text-center">
          <Star className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-bold text-muted-foreground">No spotlight set</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Pick a match below to feature it on the home page</p>
        </div>
      )}

      {/* Sport filter */}
      <div className="flex gap-1.5">
        {(["all", "football", "futsal"] as Sport[]).map(s => (
          <button key={s} onClick={() => setSport(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all capitalize",
              sport === s ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border"
            )}>{s === "all" ? "All Sports" : s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      {/* Match list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground text-sm">No matches found.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map(match => (
            <MatchRow
              key={match.id}
              match={match}
              isCurrent={match.featured === true}
              onSet={() => handleSet(match)}
              onUnset={() => handleUnset(match)}
              isPending={pendingId === match.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
