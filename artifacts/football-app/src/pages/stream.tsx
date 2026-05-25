import { useGetMatch, getGetMatchQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Info, Play, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

export default function StreamPage() {
  const { id } = useParams();
  const matchId = parseInt(id || "0", 10);
  
  const { data: match, isLoading } = useGetMatch(matchId, {
    query: {
      enabled: !!matchId,
      queryKey: getGetMatchQueryKey(matchId)
    }
  });

  const [activeStreamId, setActiveStreamId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto pb-12">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="w-full aspect-video rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
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

  // Determine active stream
  const activeStream = match.streams?.find(s => s.id === activeStreamId) || match.streams?.[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground" asChild>
        <Link href={`/match/${match.id}`}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Match
        </Link>
      </Button>

      {/* Video Player Area */}
      <div className="rounded-2xl overflow-hidden bg-black border border-border aspect-video shadow-2xl relative">
        {activeStream ? (
          activeStream.embedCode ? (
            <div dangerouslySetContent={{ __html: activeStream.embedCode }} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
          ) : (
            <iframe 
              src={activeStream.url} 
              allowFullScreen 
              allow="autoplay; encrypted-media"
              className="w-full h-full border-0"
            />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <Play className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium text-lg text-foreground">No stream available</p>
            <p className="text-sm mt-1">This match doesn't have any streams currently broadcasted.</p>
          </div>
        )}
      </div>

      {/* Info and Stream Selection */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{match.homeTeam.name} vs {match.awayTeam.name}</h1>
            <p className="text-muted-foreground">{match.competition}</p>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                If the stream buffers or fails to load, try selecting a different source or quality from the options provided. We aggregate links from third-party providers.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Available Streams
          </h3>
          
          <div className="space-y-2">
            {match.streams && match.streams.length > 0 ? (
              match.streams.map((stream) => (
                <button
                  key={stream.id}
                  onClick={() => setActiveStreamId(stream.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    (activeStream?.id === stream.id) 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-card border-border hover:border-primary/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{stream.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      (activeStream?.id === stream.id) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {stream.quality}
                    </span>
                  </div>
                  <div className="text-xs opacity-70 flex items-center gap-2">
                    <span>{stream.language}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
                No alternative streams
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
