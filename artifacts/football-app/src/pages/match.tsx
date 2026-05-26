import { useGetMatch, getGetMatchQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/team-logo";
import { LivePulse } from "@/components/live-pulse";
import { ChevronLeft, Play } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const EVENT_ICONS: Record<string, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "↕",
  penalty: "P",
};

export default function MatchDetails() {
  const { id } = useParams();
  const matchId = parseInt(id || "0", 10);

  const { data: match, isLoading } = useGetMatch(matchId, {
    query: { enabled: !!matchId, queryKey: getGetMatchQueryKey(matchId) },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 pb-6 px-4 pt-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="py-24 text-center px-4">
        <h2 className="text-xl font-bold mb-3">Match not found</h2>
        <Link href="/"><span className="text-primary text-sm font-semibold cursor-pointer">Back to Home</span></Link>
      </div>
    );
  }

  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const isScheduled = match.status === "scheduled";

  return (
    <div className="pb-6">
      {/* Back */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Link href="/">
          <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back
          </span>
        </Link>
      </div>

      {/* Scoreboard Card */}
      <div className="mx-4 featured-gradient rounded-2xl overflow-hidden border border-white/5 shadow-2xl mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-xs font-semibold text-white/70">{match.competition}</span>
          {isLive ? (
            <LivePulse text={match.minute ? `${match.minute}` : "Live"} />
          ) : isFinished ? (
            <span className="text-xs font-bold text-white/50 uppercase">Full Time</span>
          ) : (
            <span className="text-xs font-medium text-white/60">{format(new Date(match.kickoffAt), "EEE d MMM · HH:mm")}</span>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-6 gap-2">
          <div className="flex flex-col items-center gap-3 flex-1">
            <TeamLogo url={match.homeTeam.logoUrl} name={match.homeTeam.name} shortName={match.homeTeam.shortName} className="w-16 h-16" />
            <span className="text-sm font-bold text-white text-center leading-tight">{match.homeTeam.name}</span>
          </div>

          <div className="flex flex-col items-center justify-center px-4 shrink-0 gap-1">
            {(isLive || isFinished) ? (
              <div className="text-4xl font-black text-white tabular-nums tracking-tight">
                {match.homeScore} - {match.awayScore}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-black text-white/60">VS</span>
                <span className="text-xs text-white/40">{format(new Date(match.kickoffAt), "HH:mm")}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 flex-1">
            <TeamLogo url={match.awayTeam.logoUrl} name={match.awayTeam.name} shortName={match.awayTeam.shortName} className="w-16 h-16" />
            <span className="text-sm font-bold text-white text-center leading-tight">{match.awayTeam.name}</span>
          </div>
        </div>

        {/* Watch / Kickoff button */}
        <div className="px-4 pb-4">
          {match.streams && match.streams.length > 0 ? (
            <Link href={`/stream/${match.id}`}>
              <div className="flex items-center justify-center gap-2 bg-primary rounded-xl py-2.5 cursor-pointer hover:bg-primary/90 transition-colors">
                <Play className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white">
                  {isLive ? "Watch Live" : isFinished ? "Watch Replay" : "Watch Stream"}
                  {" · "}{match.streams.length} {match.streams.length === 1 ? "stream" : "streams"}
                </span>
              </div>
            </Link>
          ) : isScheduled ? (
            <div className="flex items-center justify-center gap-2 bg-white/10 rounded-xl py-2.5">
              <span className="text-sm font-semibold text-white/70">Kickoff at {format(new Date(match.kickoffAt), "HH:mm")}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Available Streams */}
      {match.streams && match.streams.length > 0 && (
        <div className="mx-4 bg-card rounded-xl border border-border overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Watch Live</span>
          </div>
          <div className="p-3 space-y-2">
            {match.streams.map((stream) => (
              <Link key={stream.id} href={`/stream/${match.id}`}>
                <div
                  className="flex items-center justify-between bg-muted/50 hover:bg-muted rounded-xl px-4 py-3 cursor-pointer border border-border hover:border-primary/40 transition-colors"
                  data-testid={`stream-link-${stream.id}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{stream.label}</p>
                    <p className="text-xs text-muted-foreground">{stream.language}</p>
                  </div>
                  <span className="text-xs font-black bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded">
                    {stream.quality}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Match Events */}
      <div className="mx-4 bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-bold text-foreground">Match Events</span>
        </div>
        {match.events && match.events.length > 0 ? (
          <div className="divide-y divide-border/50">
            {match.events.map((event) => {
              const isHome = event.teamId === match.homeTeam.id;
              return (
                <div
                  key={event.id}
                  className={cn("flex items-center px-4 py-3 gap-3", isHome ? "" : "flex-row-reverse")}
                >
                  <div className="w-10 text-center shrink-0">
                    <span className="text-xs font-bold text-primary">{event.minute}'</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-base">
                    {EVENT_ICONS[event.type] || "•"}
                  </div>
                  <div className={cn("flex-1", !isHome && "text-right")}>
                    <p className="text-sm font-semibold text-foreground">{event.playerName}</p>
                    {event.assistPlayerName && (
                      <p className="text-xs text-muted-foreground">Assist: {event.assistPlayerName}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No events recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
