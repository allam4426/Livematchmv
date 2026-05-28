import {
  useGetMatch, useGetMatchLineup, useGetTournamentStandings, useGetTeamForm,
  getGetMatchQueryKey, getGetMatchLineupQueryKey, getGetTournamentStandingsQueryKey,
  type MatchDetail,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/team-logo";
import { LivePulse } from "@/components/live-pulse";
import { ChevronLeft, Play } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/* ─── helpers ─── */
const EVENT_META: Record<string, { icon: string; label: string; color: string }> = {
  goal:            { icon: "⚽", label: "Goal",         color: "bg-emerald-600" },
  yellow_card:     { icon: "🟨", label: "Yellow Card",   color: "bg-amber-500" },
  red_card:        { icon: "🟥", label: "Red Card",      color: "bg-red-600" },
  own_goal:        { icon: "↩⚽", label: "Own Goal",     color: "bg-orange-500" },
  penalty_awarded: { icon: "P!", label: "Penalty",       color: "bg-blue-500" },
  penalty_goal:    { icon: "P⚽", label: "Penalty Goal", color: "bg-emerald-600" },
  penalty_missed:  { icon: "P✗", label: "Pen. Miss",    color: "bg-red-600" },
  substitution:    { icon: "↕",  label: "Substitution", color: "bg-blue-600" },
  mvp:             { icon: "⭐", label: "MVP",           color: "bg-amber-500" },
};

function FormDot({ result }: { result: string }) {
  const colors = { W: "bg-emerald-500", D: "bg-amber-400", L: "bg-red-500" };
  return (
    <span className={cn(
      "w-4 h-4 rounded-full inline-flex items-center justify-center text-[8px] font-black text-white",
      colors[result as keyof typeof colors] ?? "bg-white/10"
    )}>
      {result}
    </span>
  );
}

function EmptyDot() {
  return <span className="w-4 h-4 rounded-full border border-white/20 inline-block" />;
}

function TeamFormDots({ teamId }: { teamId: number }) {
  const { data } = useGetTeamForm(teamId, { query: { enabled: !!teamId, queryKey: ["teamForm", teamId] } });
  const form = data?.form ?? [];
  const empties = Math.max(0, 5 - form.length);
  if (form.length === 0 && empties === 5) return null;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: empties }).map((_, i) => <EmptyDot key={`e${i}`} />)}
      {form.map((r, i) => <FormDot key={i} result={r} />)}
    </div>
  );
}

/* ─── tabs ─── */
type Tab = "Summary" | "Squad" | "Standings";

/* ─── Summary ─── */
function SummaryTab({ match }: { match: MatchDetail }) {
  const events = match.events ?? [];
  if (events.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        No events recorded yet.
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      {events.map(event => {
        const isHome = event.teamId === match.homeTeam.id;
        const meta = EVENT_META[event.type] ?? { icon: "•", label: event.type, color: "bg-muted" };
        const isMvp = event.type === "mvp";
        return (
          <div key={event.id}
            className={cn("flex items-center gap-3 py-2.5 px-1", isHome ? "" : "flex-row-reverse")}>
            {/* Minute */}
            <span className={cn("text-xs font-black w-9 shrink-0 tabular-nums", isHome ? "text-left text-primary" : "text-right text-primary")}>
              {isMvp ? "MVP" : `${event.minute}'`}
            </span>
            {/* Icon bubble */}
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm", meta.color)}>
              {meta.icon}
            </div>
            {/* Text */}
            <div className={cn("flex-1 min-w-0", !isHome && "text-right")}>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {event.playerNumber && <span className="text-muted-foreground text-xs mr-1">#{event.playerNumber}</span>}
                {event.playerName}
              </p>
              {event.assistPlayerName && (
                <p className="text-xs text-muted-foreground">▷ {event.assistPlayerName}</p>
              )}
              {event.description && (
                <p className="text-xs text-muted-foreground italic">{event.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Squad ─── */
function SquadTab({ matchId, match }: { matchId: number; match: MatchDetail }) {
  const { data: lineup, isLoading } = useGetMatchLineup(matchId, {
    query: { enabled: !!matchId, queryKey: getGetMatchLineupQueryKey(matchId) },
  });

  if (isLoading) return <div className="py-6 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;
  if (!lineup || (!lineup.home?.length && !lineup.away?.length)) {
    return <div className="py-10 text-center text-muted-foreground text-sm">No lineup set for this match.</div>;
  }

  return (
    <div className="space-y-4">
      {(["home", "away"] as const).map(side => {
        const team = side === "home" ? match?.homeTeam : match?.awayTeam;
        const players = side === "home" ? lineup.home : lineup.away;
        if (!players?.length) return null;
        const starters = players.filter(p => p.isStarting !== false);
        const subs = players.filter(p => p.isStarting === false);
        return (
          <div key={side} className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Team header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
              <TeamLogo url={team?.logoUrl ?? null} name={team?.name ?? ""} shortName={team?.shortName ?? null} className="w-8 h-8" />
              <span className="text-sm font-bold text-foreground">{team?.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{players.length} players</span>
            </div>
            {/* Starters */}
            {starters.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-muted/10 border-b border-border/50">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Starting XI</span>
                </div>
                {starters.map((p, i) => (
                  <div key={p.id} className={cn("flex items-center gap-3 px-4 py-2.5", i > 0 && "border-t border-border/40")}>
                    <span className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0">
                      {p.playerNumber || "—"}
                    </span>
                    <span className="text-sm text-foreground font-medium flex-1">{p.playerName}</span>
                    {p.position && (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.position}</span>
                    )}
                  </div>
                ))}
              </>
            )}
            {/* Substitutes */}
            {subs.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-muted/10 border-t border-border border-b border-border/50">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Substitutes</span>
                </div>
                {subs.map((p, i) => (
                  <div key={p.id} className={cn("flex items-center gap-3 px-4 py-2.5 opacity-70", i > 0 && "border-t border-border/40")}>
                    <span className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {p.playerNumber || "—"}
                    </span>
                    <span className="text-sm text-foreground font-medium flex-1">{p.playerName}</span>
                    {p.position && (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.position}</span>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Standings ─── */
function StandingsTab({
  tournamentId,
  highlightGroup,
  homeTeamId,
  awayTeamId,
}: {
  tournamentId: number;
  highlightGroup?: string | null;
  homeTeamId: number;
  awayTeamId: number;
}) {
  const { data: standings, isLoading } = useGetTournamentStandings(tournamentId, {
    query: { enabled: !!tournamentId, queryKey: getGetTournamentStandingsQueryKey(tournamentId) },
  });

  if (isLoading) return <div className="py-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  if (!standings) return <div className="py-10 text-center text-muted-foreground text-sm">No standings available.</div>;

  const groups = standings.groups;
  const groupEntries = Object.entries(groups);

  return (
    <div className="space-y-6">
      {groupEntries.map(([groupName, rows]) => {
        const isHighlighted = highlightGroup && groupName.toLowerCase() === highlightGroup.toLowerCase();
        return (
          <div key={groupName}>
            <h3 className="text-sm font-black text-foreground mb-2">
              {groupName}
              {isHighlighted && <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">This match</span>}
            </h3>

            {/* Table header */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-x-2 px-3 py-2 border-b border-border bg-muted/30">
                <span className="text-[9px] font-black text-muted-foreground uppercase w-5 text-center">#</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase">Club</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase w-6 text-center">MP</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase w-5 text-center">W</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase w-5 text-center">D</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase w-5 text-center">L</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase w-6 text-center">GD</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase w-7 text-center">PTS</span>
              </div>
              {rows.map((row, i) => {
                const isMatchTeam = row.team.id === homeTeamId || row.team.id === awayTeamId;
                return (
                  <div key={row.team.id}
                    className={cn(
                      "grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-x-2 items-center px-3 py-2.5",
                      i > 0 && "border-t border-border/40",
                      isMatchTeam && "bg-primary/5",
                      i < 2 && "border-l-2 border-l-emerald-500/60"
                    )}>
                    <span className="text-xs font-black text-muted-foreground w-5 text-center">{row.position}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamLogo url={row.team.logoUrl} name={row.team.name} shortName={row.team.shortName} className="w-5 h-5 shrink-0" />
                      <span className={cn("text-xs font-semibold truncate", isMatchTeam ? "text-primary font-bold" : "text-foreground")}>
                        {row.team.shortName || row.team.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-center tabular-nums">{row.played}</span>
                    <span className="text-xs text-muted-foreground w-5 text-center tabular-nums">{row.won}</span>
                    <span className="text-xs text-muted-foreground w-5 text-center tabular-nums">{row.drawn}</span>
                    <span className="text-xs text-muted-foreground w-5 text-center tabular-nums">{row.lost}</span>
                    <span className={cn("text-xs w-6 text-center tabular-nums font-semibold",
                      row.goalDifference > 0 ? "text-emerald-400" : row.goalDifference < 0 ? "text-red-400" : "text-muted-foreground"
                    )}>{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</span>
                    <span className="text-xs font-black text-foreground w-7 text-center tabular-nums">{row.points}</span>
                  </div>
                );
              })}
            </div>

            {/* Form guide - Last 5 */}
            <div className="mt-2 bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Last 5 Form</span>
              </div>
              {rows.map((row, i) => {
                const guide = row.formGuide ?? [];
                const empties = Math.max(0, 5 - guide.length);
                const isMatchTeam = row.team.id === homeTeamId || row.team.id === awayTeamId;
                return (
                  <div key={row.team.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2",
                      i > 0 && "border-t border-border/40",
                      isMatchTeam && "bg-primary/5"
                    )}>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <TeamLogo url={row.team.logoUrl} name={row.team.name} shortName={row.team.shortName} className="w-5 h-5 shrink-0" />
                      <span className={cn("text-xs truncate", isMatchTeam ? "text-primary font-bold" : "text-foreground font-medium")}>
                        {row.team.shortName || row.team.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {Array.from({ length: empties }).map((_, j) => <EmptyDot key={`e${j}`} />)}
                      {guide.map((r, j) => <FormDot key={j} result={r} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── main ─── */
export default function MatchDetails() {
  const { id } = useParams();
  const matchId = parseInt(id || "0", 10);
  const [activeTab, setActiveTab] = useState<Tab>("Summary");

  const { data: match, isLoading } = useGetMatch(matchId, {
    query: {
      enabled: !!matchId,
      queryKey: getGetMatchQueryKey(matchId),
      refetchInterval: (q) => q.state.data?.status === "live" ? 20000 : false,
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 pb-6 px-4 pt-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-52 w-full rounded-2xl" />
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
  const hasTournament = !!match.tournamentId;

  const tabs: Tab[] = ["Summary", "Squad", ...(hasTournament ? ["Standings" as Tab] : [])];

  return (
    <div className="pb-8">
      {/* Back */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Link href="/">
          <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back
          </span>
        </Link>
      </div>

      {/* ── Scoreboard card ── */}
      <div className="mx-4 featured-gradient rounded-2xl overflow-hidden border border-white/5 shadow-2xl mb-4">
        {/* Top bar: competition / group / status */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white/70">{match.competition}</span>
            {match.matchGroup && (
              <span className="text-[10px] text-white/40 mt-0.5">{match.matchGroup}</span>
            )}
          </div>
          {isLive ? (
            <LivePulse text={match.minute ? `${match.minute}` : "Live"} />
          ) : isFinished ? (
            <span className="text-xs font-bold text-white/50 uppercase">Full Time</span>
          ) : (
            <span className="text-xs font-medium text-white/60">{format(new Date(match.kickoffAt), "EEE d MMM · HH:mm")}</span>
          )}
        </div>

        {/* Teams + score */}
        <div className="flex items-center justify-between px-6 py-5 gap-2">
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamLogo url={match.homeTeam.logoUrl} name={match.homeTeam.name} shortName={match.homeTeam.shortName} className="w-16 h-16" />
            <span className="text-sm font-bold text-white text-center leading-tight">{match.homeTeam.name}</span>
            <TeamFormDots teamId={match.homeTeam.id} />
          </div>
          <div className="flex flex-col items-center justify-center px-3 shrink-0 gap-1">
            {(isLive || isFinished) ? (
              <div className="text-4xl font-black text-white tabular-nums tracking-tight">
                {match.homeScore} – {match.awayScore}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-black text-white/60">VS</span>
                <span className="text-xs text-white/40">{format(new Date(match.kickoffAt), "HH:mm")}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamLogo url={match.awayTeam.logoUrl} name={match.awayTeam.name} shortName={match.awayTeam.shortName} className="w-16 h-16" />
            <span className="text-sm font-bold text-white text-center leading-tight">{match.awayTeam.name}</span>
            <TeamFormDots teamId={match.awayTeam.id} />
          </div>
        </div>

        {/* Venue */}
        {match.venue && (
          <div className="px-4 pb-3 text-center">
            <span className="text-[11px] text-white/40">{match.venue}</span>
          </div>
        )}

        {/* Stream button */}
        {match.streams && match.streams.length > 0 && (
          <div className="px-4 pb-4">
            <Link href={`/stream/${match.id}`}>
              <div className="flex items-center justify-center gap-2 bg-primary rounded-xl py-2.5 cursor-pointer hover:bg-primary/90 transition-colors">
                <Play className="w-4 h-4 text-white fill-white" />
                <span className="text-sm font-bold text-white">
                  {isLive ? "Watch Live" : isFinished ? "Watch Replay" : "Watch Stream"}
                  {" · "}{match.streams.length} {match.streams.length === 1 ? "stream" : "streams"}
                </span>
              </div>
            </Link>
          </div>
        )}
        {isScheduled && (!match.streams || match.streams.length === 0) && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center bg-white/10 rounded-xl py-2.5">
              <span className="text-sm font-semibold text-white/70">Kickoff · {format(new Date(match.kickoffAt), "HH:mm")}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-0 mx-4 mb-4 border-b border-border">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold border-b-2 transition-all",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="mx-4">
        {activeTab === "Summary" && <SummaryTab match={match} />}
        {activeTab === "Squad" && <SquadTab matchId={matchId} match={match} />}
        {activeTab === "Standings" && hasTournament && (
          <StandingsTab
            tournamentId={match.tournamentId!}
            highlightGroup={match.matchGroup}
            homeTeamId={match.homeTeam.id}
            awayTeamId={match.awayTeam.id}
          />
        )}
      </div>
    </div>
  );
}
