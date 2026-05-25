import { useGetMatch, getGetMatchQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Play } from "lucide-react";
import { useState } from "react";
import { TeamLogo } from "@/components/team-logo";
import { cn } from "@/lib/utils";

export default function StreamPage() {
  const { id } = useParams();
  const matchId = parseInt(id || "0", 10);

  const { data: match, isLoading } = useGetMatch(matchId, {
    query: { enabled: !!matchId, queryKey: getGetMatchQueryKey(matchId) },
  });

  const [activeStreamId, setActiveStreamId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 pb-6 px-4 pt-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="w-full aspect-video rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="py-24 text-center px-4">
        <h2 className="text-xl font-bold mb-3">Match not found</h2>
        <Link href="/">
          <span className="text-primary text-sm font-semibold cursor-pointer">Back to Home</span>
        </Link>
      </div>
    );
  }

  const activeStream = match.streams?.find((s) => s.id === activeStreamId) || match.streams?.[0];

  return (
    <div className="pb-6">
      {/* Back */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Link href={`/match/${match.id}`}>
          <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back
          </span>
        </Link>
      </div>

      {/* Video Player */}
      <div className="bg-black aspect-video relative">
        {activeStream ? (
          <iframe
            key={activeStream.id}
            src={activeStream.url}
            allowFullScreen
            allow="autoplay; encrypted-media"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Play className="w-6 h-6 opacity-30" />
            </div>
            <p className="text-sm font-medium">No stream available</p>
          </div>
        )}
      </div>

      {/* Match info bar */}
      <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TeamLogo
            url={match.homeTeam.logoUrl}
            name={match.homeTeam.name}
            shortName={match.homeTeam.shortName}
            className="w-7 h-7"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">
              {match.homeTeam.shortName} {match.homeScore} - {match.awayScore} {match.awayTeam.shortName}
            </span>
            <span className="text-[10px] text-muted-foreground">{match.competition}</span>
          </div>
          <TeamLogo
            url={match.awayTeam.logoUrl}
            name={match.awayTeam.name}
            shortName={match.awayTeam.shortName}
            className="w-7 h-7"
          />
        </div>
        {match.status === "live" && match.minute && (
          <span className="text-xs font-bold text-red-400 flex items-center gap-1">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            {match.minute}
          </span>
        )}
      </div>

      {/* Stream selector */}
      {match.streams && match.streams.length > 0 && (
        <div className="px-4 pt-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Available Streams</p>
          <div className="grid grid-cols-2 gap-2">
            {match.streams.map((stream) => {
              const isActive = activeStream?.id === stream.id;
              return (
                <button
                  key={stream.id}
                  onClick={() => setActiveStreamId(stream.id)}
                  data-testid={`stream-btn-${stream.id}`}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    isActive
                      ? "bg-primary/15 border-primary text-foreground"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground truncate">{stream.label}</span>
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded",
                      isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {stream.quality}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{stream.language}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="px-4 pt-4">
        <div className="bg-muted/50 rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            If the stream buffers or fails to load, try a different source. Streams are aggregated from third-party providers.
          </p>
        </div>
      </div>
    </div>
  );
}
