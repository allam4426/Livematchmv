import { Match } from "@workspace/api-client-react";
import { Card, CardContent } from "./ui/card";
import { LivePulse } from "./live-pulse";
import { TeamLogo } from "./team-logo";
import { Link } from "wouter";
import { Button } from "./ui/button";
import { format } from "date-fns";
import { motion } from "framer-motion";

export function MatchCard({ match, featured = false }: { match: Match; featured?: boolean }) {
  const isLive = match.status === "live";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/match/${match.id}`}>
        <Card className="cursor-pointer overflow-hidden border-card-border bg-card hover:border-primary/50 transition-colors h-full">
          <CardContent className="p-4 flex flex-col h-full gap-4">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-muted-foreground truncate">{match.competition}</span>
              {isLive ? (
                <LivePulse text={match.minute ? `${match.minute}'` : "LIVE"} />
              ) : match.status === "scheduled" ? (
                <span className="text-muted-foreground">{format(new Date(match.kickoffAt), "HH:mm")}</span>
              ) : (
                <span className="text-muted-foreground uppercase">{match.status}</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-1">
              <div className="flex flex-col items-center gap-2 flex-1 text-center">
                <TeamLogo url={match.homeTeam.logoUrl} name={match.homeTeam.name} shortName={match.homeTeam.shortName} className={featured ? "w-16 h-16" : "w-10 h-10"} />
                <span className="font-semibold text-sm line-clamp-1">{match.homeTeam.shortName}</span>
              </div>

              <div className="flex flex-col items-center justify-center shrink-0 px-2">
                {(isLive || match.status === "finished") ? (
                  <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter tabular-nums">
                    <span>{match.homeScore}</span>
                    <span className="text-muted-foreground text-sm">-</span>
                    <span>{match.awayScore}</span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">VS</span>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 text-center">
                <TeamLogo url={match.awayTeam.logoUrl} name={match.awayTeam.name} shortName={match.awayTeam.shortName} className={featured ? "w-16 h-16" : "w-10 h-10"} />
                <span className="font-semibold text-sm line-clamp-1">{match.awayTeam.shortName}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
