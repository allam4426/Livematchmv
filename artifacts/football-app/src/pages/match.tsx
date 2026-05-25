import { useGetMatch, getGetMatchQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/team-logo";
import { LivePulse } from "@/components/live-pulse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, Clock, ChevronLeft, Video } from "lucide-react";
import { format } from "date-fns";

export default function MatchDetails() {
  const { id } = useParams();
  const matchId = parseInt(id || "0", 10);
  
  const { data: match, isLoading } = useGetMatch(matchId, {
    query: {
      enabled: !!matchId,
      queryKey: getGetMatchQueryKey(matchId)
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-24 mb-6" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="md:col-span-2 h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-2xl font-bold mb-2">Match not found</h2>
        <Button variant="outline" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const isLive = match.status === "live";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-muted-foreground hover:text-foreground" asChild>
        <Link href="/">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      {/* Match Scoreboard */}
      <Card className="overflow-hidden border-border bg-card shadow-lg">
        <div className="bg-muted/30 border-b border-border p-4 text-center relative">
          <span className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
            {match.competition}
          </span>
          <div className="absolute right-4 top-4">
            {isLive ? (
              <LivePulse text={match.minute ? `${match.minute}'` : "LIVE"} />
            ) : (
              <span className="text-xs font-medium px-2 py-1 bg-muted rounded-md uppercase">
                {match.status}
              </span>
            )}
          </div>
        </div>
        
        <CardContent className="p-8">
          <div className="flex items-center justify-between gap-4 max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-4 flex-1">
              <TeamLogo url={match.homeTeam.logoUrl} name={match.homeTeam.name} shortName={match.homeTeam.shortName} className="w-20 h-20 md:w-28 md:h-28 drop-shadow-md" />
              <h3 className="font-bold text-lg md:text-xl text-center">{match.homeTeam.name}</h3>
            </div>

            <div className="flex flex-col items-center justify-center px-4 shrink-0">
              {(isLive || match.status === "finished") ? (
                <div className="text-4xl md:text-6xl font-black tabular-nums tracking-tighter drop-shadow-sm flex items-center gap-4">
                  <span>{match.homeScore}</span>
                  <span className="text-muted-foreground/50 text-2xl md:text-4xl">-</span>
                  <span>{match.awayScore}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xl md:text-3xl font-bold text-muted-foreground/50">VS</span>
                  <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {format(new Date(match.kickoffAt), "HH:mm")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-4 flex-1">
              <TeamLogo url={match.awayTeam.logoUrl} name={match.awayTeam.name} shortName={match.awayTeam.shortName} className="w-20 h-20 md:w-28 md:h-28 drop-shadow-md" />
              <h3 className="font-bold text-lg md:text-xl text-center">{match.awayTeam.name}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Match Events */}
        <Card className="md:col-span-2 border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="text-lg">Match Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {match.events && match.events.length > 0 ? (
              <div className="divide-y divide-border">
                {match.events.map((event) => (
                  <div key={event.id} className="p-4 flex items-center gap-4 hover:bg-muted/10 transition-colors">
                    <div className="w-12 text-center font-bold text-sm text-primary">
                      {event.minute}'
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {event.type === 'goal' ? '⚽ Goal' : 
                         event.type === 'yellow_card' ? '🟨 Yellow Card' : 
                         event.type === 'red_card' ? '🟥 Red Card' : 
                         event.type === 'substitution' ? '🔄 Substitution' : '•'} 
                        {' '}- {event.playerName}
                      </p>
                      {event.assistPlayerName && (
                        <p className="text-xs text-muted-foreground">Assist: {event.assistPlayerName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No events recorded yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Streams */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              Watch Live
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {match.streams && match.streams.length > 0 ? (
              <div className="space-y-3">
                {match.streams.map((stream) => (
                  <Button 
                    key={stream.id} 
                    variant="outline" 
                    className="w-full justify-between h-auto py-3 bg-background hover:bg-muted hover:border-primary/50" 
                    asChild
                  >
                    <Link href={`/stream/${stream.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{stream.label}</span>
                          <span className="text-xs text-muted-foreground">{stream.language}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 bg-primary/20 text-primary rounded">
                        {stream.quality}
                      </span>
                    </Link>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground flex flex-col items-center">
                <Video className="w-8 h-8 mb-2 opacity-20" />
                <p>No streams available yet.</p>
                {match.status === "scheduled" && (
                  <p className="text-xs mt-1">Streams usually appear closer to kickoff.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
