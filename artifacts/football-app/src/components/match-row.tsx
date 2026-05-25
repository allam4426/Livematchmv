import { Match } from "@workspace/api-client-react";
import { TeamLogo } from "./team-logo";
import { Link } from "wouter";
import { format } from "date-fns";
import { motion } from "framer-motion";

export function MatchRow({ match, index = 0 }: { match: Match; index?: number }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
    >
      <Link href={`/match/${match.id}`}>
        <div
          className="match-row flex items-center px-4 py-3 cursor-pointer transition-colors border-b border-border/50 last:border-0"
          data-testid={`match-row-${match.id}`}
        >
          {/* Home team */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <TeamLogo
              url={match.homeTeam.logoUrl}
              name={match.homeTeam.name}
              shortName={match.homeTeam.shortName}
              className="w-6 h-6 shrink-0"
            />
            <span className="text-sm font-semibold text-foreground truncate">{match.homeTeam.name}</span>
          </div>

          {/* Score / VS / Time */}
          <div className="flex flex-col items-center justify-center shrink-0 w-24 mx-1">
            {isLive ? (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-2 font-black text-base tabular-nums text-foreground">
                  <span>{match.homeScore}</span>
                  <span className="text-muted-foreground/60 text-sm">-</span>
                  <span>{match.awayScore}</span>
                </div>
                <span className="text-[10px] font-bold text-red-400">{match.minute}</span>
              </div>
            ) : isFinished ? (
              <div className="flex items-center gap-2 font-black text-base tabular-nums text-muted-foreground">
                <span>{match.homeScore}</span>
                <span className="text-muted-foreground/40 text-sm">-</span>
                <span>{match.awayScore}</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-primary tabular-nums">
                {format(new Date(match.kickoffAt), "HH:mm")}
              </span>
            )}
          </div>

          {/* Away team */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
            <span className="text-sm font-semibold text-foreground truncate text-right">{match.awayTeam.name}</span>
            <TeamLogo
              url={match.awayTeam.logoUrl}
              name={match.awayTeam.name}
              shortName={match.awayTeam.shortName}
              className="w-6 h-6 shrink-0"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
