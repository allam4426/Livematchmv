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
import { PenaltyIcon } from "@/components/penalty-icon";

/* ─── helpers ─── */

function FormDot({ result }: { result: string }) {
  const colors = { W: "bg-emerald-500", D: "bg-slate-500", L: "bg-red-500" };
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

type EventPhase = "pso" | "et2" | "et1" | "h2" | "h1";

function getEventPhase(minute: string, sport?: string | null): EventPhase {
  if (!minute || minute === "PSO") return "pso";
  const base = parseInt(minute.split("+")[0], 10);
  if (isNaN(base)) return "pso";
  const isFutsal = sport === "futsal";
  if (isFutsal) {
    if (base > 40) return "et1"; // futsal ET is one chunk
    if (base > 20) return "h2";
    return "h1";
  }
  // Football
  if (base > 105) return "et2";
  if (base > 90)  return "et1";
  if (base > 45)  return "h2";
  return "h1";
}

function PhaseSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-black text-muted-foreground/80 uppercase tracking-widest shrink-0 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

const EVENT_INFO: Record<string, { emoji: string; label: string }> = {
  goal:               { emoji: "⚽",   label: "Goal" },
  penalty_goal:       { emoji: "⚽",   label: "Pen. Goal" },
  own_goal:           { emoji: "⚽",   label: "Own Goal" },
  ten_meter_goal:     { emoji: "🎯",   label: "10m Pen Goal" },
  foul:               { emoji: "🚫",   label: "Foul" },
  yellow_card:        { emoji: "🟨",   label: "Yellow" },
  red_card:           { emoji: "🟥",   label: "Red Card" },
  second_yellow_red:  { emoji: "🟨🟥", label: "2nd Yellow" },
  penalty_missed:     { emoji: "❌",   label: "Pen. Missed" },
  penalty_awarded:    { emoji: "📋",   label: "Penalty" },
  substitution:       { emoji: "🔄",   label: "Sub" },
  mvp:                { emoji: "⭐",   label: "MVP" },
};

function EventIcon({ type }: { type: string }) {
  const info = EVENT_INFO[type] ?? { emoji: "•", label: type };
  return (
    <div className="w-11 h-11 rounded-2xl bg-[#141e2e] flex items-center justify-center text-[18px] shrink-0 z-10 border border-white/5 overflow-hidden">
      {type === "substitution"
        ? <img src="/sub-icon.jpeg" alt="Sub" className="w-full h-full object-cover" />
        : type === "penalty_goal"
        ? <PenaltyIcon outcome="goal" />
        : type === "penalty_missed"
        ? <PenaltyIcon outcome="missed" />
        : info.emoji}
    </div>
  );
}

interface SummaryEvent {
  id: number;
  type: string;
  minute: string;
  teamId: number;
  playerName?: string | null;
  playerNumber?: string | null;
  assistPlayerName?: string | null;
  description?: string | null;
}

function EventRow({ event, homeTeamId, isPSO }: { event: SummaryEvent; homeTeamId: number; isPSO?: boolean }) {
  const isHome = event.teamId === homeTeamId;
  const minuteLabel = isPSO ? "PEN" : `${event.minute}'`;
  const info = EVENT_INFO[event.type] ?? { emoji: "•", label: event.type };
  const isSub = event.type === "substitution";
  const subOut = isSub && event.description
    ? event.description.replace(/^Out:\s*/i, "").split(" · ")[0]?.trim()
    : null;

  const icon = <EventIcon type={event.type} />;

  const textBlock = (
    <div className={cn("flex flex-col min-w-0 max-w-[130px]", isHome ? "items-end text-right" : "items-start text-left")}>
      <span className="text-[10px] text-muted-foreground/50 tabular-nums leading-none mb-0.5">{minuteLabel}</span>
      <span className="text-sm font-black text-foreground leading-tight">{info.label}</span>
      {isSub ? (
        <>
          {event.playerName && (
            <span className="text-[11px] text-emerald-400 leading-none mt-0.5 truncate w-full font-semibold">
              ↑ {event.playerNumber ? `#${event.playerNumber} ` : ""}{event.playerName}
            </span>
          )}
          {subOut && (
            <span className="text-[11px] text-red-400 leading-none mt-0.5 truncate w-full font-semibold">
              ↓ {subOut}
            </span>
          )}
        </>
      ) : (
        <>
          {event.playerName && (
            <span className="text-[11px] text-muted-foreground leading-none mt-0.5 truncate w-full">
              {event.playerNumber ? `#${event.playerNumber} ` : ""}{event.playerName}
            </span>
          )}
          {event.assistPlayerName && (
            <span className="text-[10px] text-muted-foreground/50 leading-none truncate w-full">▷ {event.assistPlayerName}</span>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="flex items-center py-1.5">
      {isHome ? (
        <>
          <div className="flex-1 flex justify-end pr-2.5">{textBlock}</div>
          {icon}
          <div className="flex-1" />
        </>
      ) : (
        <>
          <div className="flex-1" />
          {icon}
          <div className="flex-1 flex justify-start pl-2.5">{textBlock}</div>
        </>
      )}
    </div>
  );
}

function SummaryTab({ match }: { match: MatchDetail }) {
  const rawEvents = (match.events ?? []) as SummaryEvent[];
  const sport = match.sport;
  const phase = (minute: string) => getEventPhase(minute, sport);

  if (rawEvents.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        No events recorded yet.
      </div>
    );
  }

  const mvpEvents    = rawEvents.filter(e => e.type === "mvp");
  const lineEvents   = rawEvents.filter(e => e.type !== "mvp");
  const psoEvents    = lineEvents.filter(e => phase(e.minute) === "pso");
  const et2Events    = [...lineEvents.filter(e => phase(e.minute) === "et2")].reverse();
  const et1Events    = [...lineEvents.filter(e => phase(e.minute) === "et1")].reverse();
  const h2Events     = [...lineEvents.filter(e => phase(e.minute) === "h2")].reverse();
  const h1Events     = [...lineEvents.filter(e => phase(e.minute) === "h1")].reverse();

  // HT score from H1 goal events
  const goalTypes = ["goal", "penalty_goal", "ten_meter_goal"];
  const htHome = h1Events.filter(e => goalTypes.includes(e.type) && e.teamId === match.homeTeam.id).length
               + h1Events.filter(e => e.type === "own_goal" && e.teamId === match.awayTeam.id).length;
  const htAway = h1Events.filter(e => goalTypes.includes(e.type) && e.teamId === match.awayTeam.id).length
               + h1Events.filter(e => e.type === "own_goal" && e.teamId === match.homeTeam.id).length;

  // FT score (before PSO)
  const finalHome = match.homeScore ?? 0;
  const finalAway = match.awayScore ?? 0;
  const psoHome = psoEvents.filter(e => e.type === "penalty_goal" && e.teamId === match.homeTeam.id).length;
  const psoAway = psoEvents.filter(e => e.type === "penalty_goal" && e.teamId === match.awayTeam.id).length;
  const ftHome = finalHome - psoHome;
  const ftAway = finalAway - psoAway;

  // ET1 score = goals scored in H1+H2
  const h1h2GoalsHome = [...h1Events, ...h2Events].filter(e => goalTypes.includes(e.type) && e.teamId === match.homeTeam.id).length
    + [...h1Events, ...h2Events].filter(e => e.type === "own_goal" && e.teamId === match.awayTeam.id).length;
  const h1h2GoalsAway = [...h1Events, ...h2Events].filter(e => goalTypes.includes(e.type) && e.teamId === match.awayTeam.id).length
    + [...h1Events, ...h2Events].filter(e => e.type === "own_goal" && e.teamId === match.homeTeam.id).length;

  let kickoffStr = "";
  try { kickoffStr = format(new Date(match.kickoffAt), "HH:mm"); } catch {}

  const hasET1 = et1Events.length > 0;
  const hasET2 = et2Events.length > 0;
  const hasET = hasET1 || hasET2;
  const hasPSO = psoEvents.length > 0;
  const isFinished = match.status === "finished";

  return (
    <div className="px-4 py-2">
      {/* Centre line */}
      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/40 -translate-x-1/2 pointer-events-none" />

        {/* ── PSO section ── */}
        {hasPSO && (
          <>
            {psoEvents.map(e => (
              <EventRow key={e.id} event={e} homeTeamId={match.homeTeam.id} isPSO />
            ))}
            <PhaseSeparator label={`AET (${ftHome}-${ftAway})`} />
          </>
        )}

        {/* ── ET2 events (106-120') ── */}
        {hasET2 && (
          <>
            {et2Events.map(e => (
              <EventRow key={e.id} event={e} homeTeamId={match.homeTeam.id} />
            ))}
            <PhaseSeparator label="ET 2nd Half · 106–120'" />
          </>
        )}

        {/* ── ET1 events (91-105') ── */}
        {hasET1 && (
          <>
            {et1Events.map(e => (
              <EventRow key={e.id} event={e} homeTeamId={match.homeTeam.id} />
            ))}
            {hasET ? (
              <PhaseSeparator label={`ET 1st Half · 91–105' · FT (${h1h2GoalsHome}-${h1h2GoalsAway})`} />
            ) : null}
          </>
        )}

        {/* FT divider when no ET/PSO */}
        {!hasET && !hasPSO && isFinished && (
          <PhaseSeparator label={`Full Time (${finalHome}-${finalAway})`} />
        )}

        {/* FT divider when there IS ET */}
        {hasET && !hasET2 && (
          <PhaseSeparator label={`Full Time (${h1h2GoalsHome}-${h1h2GoalsAway})`} />
        )}

        {/* ── H2 events ── */}
        {h2Events.map(e => (
          <EventRow key={e.id} event={e} homeTeamId={match.homeTeam.id} />
        ))}

        {/* HT divider */}
        {(h1Events.length > 0 || h2Events.length > 0) && (
          <PhaseSeparator label={`Half Time · ${sport === "futsal" ? "20" : "45"}' (${htHome}-${htAway})`} />
        )}

        {/* ── H1 events ── */}
        {h1Events.map(e => (
          <EventRow key={e.id} event={e} homeTeamId={match.homeTeam.id} />
        ))}

        {/* KO */}
        {kickoffStr && <PhaseSeparator label={`Kick Off · ${kickoffStr}`} />}
      </div>

      {/* MVP */}
      {mvpEvents.map(e => (
        <div key={e.id} className="flex items-center justify-center gap-2 pt-3 mt-2 border-t border-border/40">
          <span className="text-amber-400 text-lg">⭐</span>
          <div className="text-center">
            <p className="text-sm font-black text-foreground">{e.playerName}</p>
            <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide">Man of the Match</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Squad / Pitch ─── */

type LineupPlayer = {
  id: number; playerName: string; playerNumber: string | null;
  position?: string | null; role?: string | null; isStarting?: boolean | null;
};

// ── Squad list helpers ────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-700","bg-emerald-700","bg-violet-700","bg-orange-600",
  "bg-teal-700","bg-rose-700","bg-indigo-700","bg-pink-700",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").toUpperCase();
}

function SquadAvatar({
  player, events, side,
}: {
  player: LineupPlayer; events: SummaryEvent[]; side: "home" | "away";
}) {
  const isCaptain = player.role === "captain";
  const playerEvents = events.filter(e => e.playerName === player.playerName);
  const hasYellow = playerEvents.some(e => e.type === "yellow_card" || e.type === "second_yellow_red");
  const hasRed    = playerEvents.some(e => e.type === "red_card"    || e.type === "second_yellow_red");
  const subbedOn  = events.some(e => e.type === "substitution" && e.playerName === player.playerName);
  const subbedOff = events.some(e => e.type === "substitution" && e.description?.includes(player.playerName));

  return (
    <div className="relative shrink-0">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white",
        avatarColor(player.playerName)
      )}>
        {initials(player.playerName)}
      </div>
      {isCaptain && (
        <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-amber-400 border border-background flex items-center justify-center text-[7px] font-black text-black leading-none">C</span>
      )}
      {hasRed ? (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2.5 rounded-[2px] bg-red-500 border border-background" />
      ) : hasYellow ? (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2.5 rounded-[2px] bg-yellow-400 border border-background" />
      ) : null}
      {subbedOn && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border border-background flex items-center justify-center text-[7px] text-white font-black leading-none">↑</span>
      )}
      {subbedOff && !subbedOn && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border border-background flex items-center justify-center text-[7px] text-white font-black leading-none">↓</span>
      )}
    </div>
  );
}

function SquadPlayerRow({
  home, away, events,
}: {
  home?: LineupPlayer; away?: LineupPlayer; events: SummaryEvent[];
}) {
  return (
    <div className="grid grid-cols-2 border-t border-border/30 first:border-t-0">
      {/* Home player — avatar left, text right */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-r border-border/30">
        {home ? (
          <>
            <SquadAvatar player={home} events={events} side="home" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-foreground leading-tight truncate">{home.playerName}</p>
              {home.playerNumber && (
                <p className="text-[10px] text-muted-foreground font-medium">#{home.playerNumber}</p>
              )}
            </div>
          </>
        ) : null}
      </div>
      {/* Away player — text left, avatar right */}
      <div className="flex items-center justify-end gap-2 px-3 py-2.5">
        {away ? (
          <>
            <div className="min-w-0 text-right">
              <p className="text-[12px] font-semibold text-foreground leading-tight truncate">{away.playerName}</p>
              {away.playerNumber && (
                <p className="text-[10px] text-muted-foreground font-medium">#{away.playerNumber}</p>
              )}
            </div>
            <SquadAvatar player={away} events={events} side="away" />
          </>
        ) : null}
      </div>
    </div>
  );
}

function SquadSection({
  label, home, away, events,
}: {
  label: string; home: LineupPlayer[]; away: LineupPlayer[]; events: SummaryEvent[];
}) {
  if (home.length === 0 && away.length === 0) return null;
  const rows = Math.max(home.length, away.length);
  return (
    <>
      <div className="px-4 py-1.5 bg-muted/20 border-t border-border/40">
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SquadPlayerRow key={i} home={home[i]} away={away[i]} events={events} />
      ))}
    </>
  );
}

function SquadTab({ matchId, match }: { matchId: number; match: MatchDetail }) {
  const { data: lineup, isLoading } = useGetMatchLineup(matchId, {
    query: { enabled: !!matchId, queryKey: getGetMatchLineupQueryKey(matchId) },
  });

  const events = (match.events ?? []) as SummaryEvent[];

  if (isLoading) return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-none first:rounded-t-xl last:rounded-b-xl" />)}
    </div>
  );
  if (!lineup || (!lineup.home?.length && !lineup.away?.length)) {
    return <div className="py-10 text-center text-muted-foreground text-sm">No lineup set for this match.</div>;
  }

  const homePlayers = (lineup.home ?? []) as LineupPlayer[];
  const awayPlayers = (lineup.away ?? []) as LineupPlayer[];
  const homeStarters = homePlayers.filter(p => p.isStarting !== false).sort((a, b) => a.playerName.localeCompare(b.playerName));
  const awayStarters = awayPlayers.filter(p => p.isStarting !== false).sort((a, b) => a.playerName.localeCompare(b.playerName));
  const homeSubs = homePlayers.filter(p => p.isStarting === false).sort((a, b) => a.playerName.localeCompare(b.playerName));
  const awaySubs = awayPlayers.filter(p => p.isStarting === false).sort((a, b) => a.playerName.localeCompare(b.playerName));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Team header */}
      <div className="grid grid-cols-2 bg-muted/20">
        <div className="flex items-center gap-2 px-3 py-3 border-r border-border">
          <TeamLogo url={match.homeTeam.logoUrl} name={match.homeTeam.name} shortName={match.homeTeam.shortName} className="w-6 h-6 shrink-0" />
          <span className="text-[12px] font-bold text-foreground leading-tight line-clamp-2">{match.homeTeam.name}</span>
        </div>
        <div className="flex items-center justify-end gap-2 px-3 py-3">
          <span className="text-[12px] font-bold text-foreground leading-tight text-right line-clamp-2">{match.awayTeam.name}</span>
          <TeamLogo url={match.awayTeam.logoUrl} name={match.awayTeam.name} shortName={match.awayTeam.shortName} className="w-6 h-6 shrink-0" />
        </div>
      </div>

      {/* Starting XI */}
      <SquadSection label="Starting XI" home={homeStarters} away={awayStarters} events={events} />

      {/* Substitutes */}
      <SquadSection label="Substitutes" home={homeSubs} away={awaySubs} events={events} />
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
