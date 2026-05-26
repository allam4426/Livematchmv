import { useGetMatch, getGetMatchQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Play } from "lucide-react";
import { useState } from "react";
import { TeamLogo } from "@/components/team-logo";
import { cn } from "@/lib/utils";

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

function isM3u8Url(url: string) {
  return /\.m3u8(\?.*)?$/i.test(url);
}

function StreamPlayer({ stream }: { stream: { url: string; embedCode?: string | null; label: string } }) {
  if (stream.embedCode) {
    return (
      <div
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: stream.embedCode }}
        style={{ lineHeight: 0 }}
      />
    );
  }

  if (isVideoUrl(stream.url)) {
    return (
      <video
        key={stream.url}
        src={stream.url}
        controls
        autoPlay
        className="w-full h-full object-contain bg-black"
        controlsList="nodownload"
      />
    );
  }

  if (isM3u8Url(stream.url)) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 bg-black">
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
          <Play className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium">HLS Stream</p>
        <a
          href={stream.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline"
        >
          Open in external player
        </a>
      </div>
    );
  }

  // Default: iframe for YouTube embeds, Twitch, etc.
  return (
    <iframe
      key={stream.url}
      src={stream.url}
      allowFullScreen
      allow="autoplay; encrypted-media; picture-in-picture"
      className="w-full h-full border-0"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

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

  const streams = match.streams ?? [];
  const activeStream = streams.find((s) => s.id === activeStreamId) || streams[0];

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
      <div className="bg-black aspect-video relative overflow-hidden">
        {activeStream ? (
          <StreamPlayer stream={activeStream} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Play className="w-6 h-6 opacity-30" />
            </div>
            <p className="text-sm font-medium">No stream available for this match</p>
            <p className="text-xs text-muted-foreground/70">Streams are added by admins before/during the match</p>
          </div>
        )}
      </div>

      {/* Match info bar */}
      <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TeamLogo url={match.homeTeam.logoUrl} name={match.homeTeam.name} shortName={match.homeTeam.shortName} className="w-7 h-7" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">
              {match.homeTeam.shortName} {match.homeScore} - {match.awayScore} {match.awayTeam.shortName}
            </span>
            <span className="text-[10px] text-muted-foreground">{match.competition}</span>
          </div>
          <TeamLogo url={match.awayTeam.logoUrl} name={match.awayTeam.name} shortName={match.awayTeam.shortName} className="w-7 h-7" />
        </div>
        {match.status === "live" && match.minute && (
          <span className="text-xs font-bold text-red-400 flex items-center gap-1">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            {match.minute}
          </span>
        )}
      </div>

      {/* Stream selector */}
      {streams.length > 0 && (
        <div className="px-4 pt-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Available Streams ({streams.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {streams.map((stream) => {
              const isActive = activeStream?.id === stream.id;
              return (
                <button
                  key={stream.id}
                  onClick={() => setActiveStreamId(stream.id)}
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
                      "text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ml-1",
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
            If the stream fails to load, try a different source or refresh the page. For best experience use a stable connection.
          </p>
        </div>
      </div>
    </div>
  );
}
