import {
  useGetTournament,
  useGetTournamentStandings,
  useGetTournamentMatches,
  getGetTournamentQueryKey,
  getGetTournamentStandingsQueryKey,
  getGetTournamentMatchesQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/team-logo";
import { MatchRow } from "@/components/match-row";
import { Trophy, ChevronLeft, Calendar, Layers, GitBranch, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

/* ─── form dot ─── */
function FormDot({ result }: { result: string }) {
  const colors: Record<string, string> = { W: "bg-emerald-500", D: "bg-slate-500", L: "bg-red-500" };
  return (
    <span className={cn(
      "w-4 h-4 rounded-full inline-flex items-center justify-center text-[8px] font-black text-white shrink-0",
      colors[result] ?? "bg-white/10"
    )}>
      {result}
    </span>
  );
}

/* ─── constants ─── */
const FORMAT_LABELS: Record<string, string> = {
  league: "League",
  group_stage: "Group Stage",
  knockout: "Knockout",
};

const ROUND_ORDER = [
  "round of 128",
  "round of 64",
  "round of 32",
  "round of 16",
  "round of 8",
  "quarter-final",
  "quarter-finals",
  "quarterfinal",
  "quarterfinals",
  "qf",
  "semi-final",
  "semi-finals",
  "semifinal",
  "semifinals",
  "sf",
  "third place",
  "third-place",
  "third place playoff",
  "playoff",
  "play-off",
  "final",
  "grand final",
  "championship",
];

function normalizeRound(s: string) {
  return s.toLowerCase().replace(/[-_\s]+/g, " ").trim();
}

function roundOrder(name: string): number {
  const n = normalizeRound(name);
  const idx = ROUND_ORDER.indexOf(n);
  return idx === -1 ? 999 : idx;
}

/* ─── BracketMatchCard ─── */
const CARD_H = 76; // px — height of each bracket card

type MatchItem = {
  id: number;
  homeTeam: { id: number; name: string; shortName: string | null; logoUrl: string | null };
  awayTeam: { id: number; name: string; shortName: string | null; logoUrl: string | null };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  minute: string | null;
  matchGroup?: string | null;
  kickoffAt: string;
};

function BracketMatchCard({ match }: { match: MatchItem }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const homeWon = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <Link href={`/match/${match.id}`}>
      <div className={cn(
        "w-full rounded-xl border overflow-hidden cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]",
        isLive ? "border-red-500/40 bg-red-500/5" : "border-border bg-card"
      )} style={{ height: CARD_H }}>
        {/* Home team */}
        <div className={cn(
          "flex items-center gap-2 px-2.5 border-b",
          "border-border/40",
          homeWon ? "bg-primary/8" : ""
        )} style={{ height: CARD_H / 2 }}>
          <TeamLogo
            url={match.homeTeam.logoUrl ?? ""}
            name={match.homeTeam.name}
            shortName={match.homeTeam.shortName ?? match.homeTeam.name}
            className="w-4 h-4 shrink-0"
          />
          <span className={cn(
            "text-xs flex-1 truncate font-semibold",
            homeWon ? "text-foreground font-black" : "text-muted-foreground"
          )}>
            {match.homeTeam.shortName || match.homeTeam.name}
          </span>
          {isLive ? (
            <span className="text-xs font-black text-red-400 shrink-0">{match.homeScore ?? 0}</span>
          ) : isFinished ? (
            <span className={cn("text-xs font-black shrink-0", homeWon ? "text-foreground" : "text-muted-foreground")}>
              {match.homeScore ?? 0}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50 shrink-0">—</span>
          )}
        </div>
        {/* Away team */}
        <div className={cn(
          "flex items-center gap-2 px-2.5",
          awayWon ? "bg-primary/8" : ""
        )} style={{ height: CARD_H / 2 }}>
          <TeamLogo
            url={match.awayTeam.logoUrl ?? ""}
            name={match.awayTeam.name}
            shortName={match.awayTeam.shortName ?? match.awayTeam.name}
            className="w-4 h-4 shrink-0"
          />
          <span className={cn(
            "text-xs flex-1 truncate font-semibold",
            awayWon ? "text-foreground font-black" : "text-muted-foreground"
          )}>
            {match.awayTeam.shortName || match.awayTeam.name}
          </span>
          {isLive ? (
            <span className="text-xs font-black text-red-400 shrink-0">{match.awayScore ?? 0}</span>
          ) : isFinished ? (
            <span className={cn("text-xs font-black shrink-0", awayWon ? "text-foreground" : "text-muted-foreground")}>
              {match.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50 shrink-0">—</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── KnockoutBracket ─── */
const CONNECTOR_W = 24; // px — width of the right connector area
const CARD_W = 148;     // px — width of each bracket card
const COL_W = CARD_W + CONNECTOR_W; // total column width incl. connector area

function KnockoutBracket({ matches }: { matches: MatchItem[] }) {
  // Group matches by round
  const roundMap = new Map<string, MatchItem[]>();
  for (const m of matches) {
    const round = m.matchGroup ?? "Final";
    if (!roundMap.has(round)) roundMap.set(round, []);
    roundMap.get(round)!.push(m);
  }

  if (roundMap.size === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border mx-4">
        <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
        No matches in the bracket yet. Add matches with round names (e.g. "Quarter-Final") to build the bracket.
      </div>
    );
  }

  // Sort rounds
  const sortedRounds = Array.from(roundMap.entries()).sort(
    ([a], [b]) => roundOrder(a) - roundOrder(b)
  );

  const maxInRound = Math.max(...sortedRounds.map(([, ms]) => ms.length));
  const BASE_SLOT_H = CARD_H + 8; // slot height for the densest round

  // Total bracket height = maxInRound * BASE_SLOT_H
  const totalH = maxInRound * BASE_SLOT_H;

  return (
    <div className="overflow-x-auto pb-4 px-4">
      <div className="flex items-start" style={{ minWidth: sortedRounds.length * COL_W + CONNECTOR_W }}>
        {sortedRounds.map(([roundName, roundMatches], roundIdx) => {
          const isLast = roundIdx === sortedRounds.length - 1;
          // How many slots does each match occupy in this round?
          const slotMultiplier = maxInRound / roundMatches.length;
          const slotH = slotMultiplier * BASE_SLOT_H;

          return (
            <div key={roundName} style={{ width: COL_W, flexShrink: 0 }}>
              {/* Round header */}
              <div className="text-center mb-3 px-1" style={{ width: CARD_W }}>
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">{roundName}</span>
              </div>

              {/* Match slots */}
              <div style={{ height: totalH, position: "relative" }}>
                {roundMatches.map((match, matchIdx) => {
                  const slotTop = matchIdx * slotH;
                  const cardTop = slotTop + slotH / 2 - CARD_H / 2;

                  // Connector lines on the right side
                  // For even-indexed matches (top of pair): border right + bottom
                  // For odd-indexed matches (bottom of pair): border right + top
                  const isTopOfPair = matchIdx % 2 === 0;
                  const hasConnector = !isLast;

                  // The vertical connector line runs from the card center to the pair midpoint
                  // For top of pair: from center downward to slot bottom
                  // For bottom of pair: from slot top to center
                  const connectorFromY = isTopOfPair
                    ? cardTop + CARD_H / 2    // card center
                    : slotTop;                 // slot top (= prev card center)
                  const connectorToY = isTopOfPair
                    ? slotTop + slotH          // slot bottom (= next card center)
                    : cardTop + CARD_H / 2;    // card center

                  return (
                    <div key={match.id}>
                      {/* Card */}
                      <div
                        style={{
                          position: "absolute",
                          top: cardTop,
                          left: 0,
                          width: CARD_W,
                        }}
                      >
                        <BracketMatchCard match={match} />
                      </div>

                      {/* Horizontal line from card right edge to connector area */}
                      {hasConnector && (
                        <div
                          style={{
                            position: "absolute",
                            top: cardTop + CARD_H / 2 - 1,
                            left: CARD_W,
                            width: CONNECTOR_W / 2,
                            height: 2,
                            backgroundColor: "hsl(var(--border))",
                          }}
                        />
                      )}

                      {/* Vertical connector line (right half of CONNECTOR_W) */}
                      {hasConnector && (
                        <div
                          style={{
                            position: "absolute",
                            top: connectorFromY,
                            left: CARD_W + CONNECTOR_W / 2 - 1,
                            width: 2,
                            height: Math.abs(connectorToY - connectorFromY),
                            backgroundColor: "hsl(var(--border))",
                          }}
                        />
                      )}

                      {/* Horizontal line from vertical connector to next column */}
                      {hasConnector && !isTopOfPair && (
                        <div
                          style={{
                            position: "absolute",
                            top: (slotTop - slotH / 2) + slotH / 2 - 1,
                            left: CARD_W + CONNECTOR_W / 2 - 1,
                            width: CONNECTOR_W / 2 + 1,
                            height: 2,
                            backgroundColor: "hsl(var(--border))",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main TournamentPage ─── */
export default function TournamentPage() {
  const { id } = useParams();
  const tournamentId = parseInt(id || "0", 10);

  const isKnockout = (fmt?: string | null) => fmt === "knockout";
  const isGroupStageOrKnockout = (fmt?: string | null) => fmt === "group_stage" || fmt === "knockout";

  type Tab = "matches" | "standings" | "bracket" | "teams";
  const [activeTab, setActiveTab] = useState<Tab>("matches");

  const { data: tournament, isLoading: tLoading } = useGetTournament(tournamentId, {
    query: { enabled: !!tournamentId, queryKey: getGetTournamentQueryKey(tournamentId) },
  });
  const { data: matches, isLoading: mLoading } = useGetTournamentMatches(tournamentId, {
    query: { enabled: !!tournamentId, queryKey: getGetTournamentMatchesQueryKey(tournamentId) },
  });
  const { data: standings, isLoading: sLoading } = useGetTournamentStandings(tournamentId, {
    query: {
      enabled: !!tournamentId && activeTab === "standings",
      queryKey: getGetTournamentStandingsQueryKey(tournamentId),
    },
  });

  if (tLoading) {
    return (
      <div className="space-y-4 pb-6 px-4 pt-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="py-24 text-center px-4">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <h2 className="text-xl font-bold mb-3">Tournament not found</h2>
        <Link href="/">
          <span className="text-primary text-sm font-semibold cursor-pointer">Back to Home</span>
        </Link>
      </div>
    );
  }

  const fmt = tournament.format;
  const isGroupStage = fmt === "group_stage";

  /* ── unique teams from matches ── */
  const teamMap = new Map<number, MatchItem["homeTeam"]>();
  if (matches) {
    for (const m of matches) {
      if (!teamMap.has(m.homeTeam.id)) teamMap.set(m.homeTeam.id, m.homeTeam);
      if (!teamMap.has(m.awayTeam.id)) teamMap.set(m.awayTeam.id, m.awayTeam);
    }
  }
  const participatingTeams = Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  /* ── bracket matches (for group_stage: only knockout rounds) ── */
  const bracketMatches = isGroupStage
    ? ((matches ?? []) as MatchItem[]).filter(m => m.matchGroup && roundOrder(m.matchGroup) !== 999)
    : (matches ?? []) as MatchItem[];

  /* ── group matches for the Matches tab ── */
  const groupedMatches: Record<string, typeof matches> = {};
  if (matches) {
    for (const m of matches) {
      const key =
        isGroupStage && m.matchGroup
          ? m.matchGroup
          : isKnockout(fmt) && m.matchGroup
          ? m.matchGroup
          : format(new Date(m.kickoffAt), "EEEE, d MMMM yyyy");
      if (!groupedMatches[key]) groupedMatches[key] = [];
      groupedMatches[key]!.push(m);
    }
  }

  const sortedGroupKeys = Object.keys(groupedMatches).sort((a, b) => {
    if (isGroupStage || isKnockout(fmt)) {
      const oa = roundOrder(a);
      const ob = roundOrder(b);
      if (oa !== 999 || ob !== 999) return oa - ob;
      return a.localeCompare(b);
    }
    const da = new Date(groupedMatches[a]![0]!.kickoffAt);
    const db2 = new Date(groupedMatches[b]![0]!.kickoffAt);
    return da.getTime() - db2.getTime();
  });

  /* ── tabs config ── */
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "matches", label: "Matches", icon: <Calendar className="w-3.5 h-3.5" /> },
    ...(participatingTeams.length > 0
      ? [{ id: "teams" as Tab, label: "Teams", icon: <Users className="w-3.5 h-3.5" /> }]
      : []),
    ...(isGroupStageOrKnockout(fmt)
      ? [{ id: "bracket" as Tab, label: "Bracket", icon: <GitBranch className="w-3.5 h-3.5" /> }]
      : []),
    ...(!isKnockout(fmt)
      ? [{ id: "standings" as Tab, label: "Standings", icon: <Trophy className="w-3.5 h-3.5" /> }]
      : []),
  ];

  return (
    <div className="pb-6">
      {/* Back */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Link href="/">
          <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </span>
        </Link>
      </div>

      {/* Tournament Header */}
      <div className="mx-4 featured-gradient rounded-2xl border border-white/5 shadow-xl px-5 py-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
            {tournament.logoUrl ? (
              <img src={tournament.logoUrl} alt={tournament.name} className="w-12 h-12 object-contain" />
            ) : (
              <Trophy className="w-8 h-8 text-white/60" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight">{tournament.name}</h1>
            <p className="text-sm text-white/60 mt-0.5 capitalize">
              {tournament.sport} · {tournament.season}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/15 text-white/80 px-2 py-0.5 rounded-full">
                <Layers className="w-3 h-3" />
                {FORMAT_LABELS[tournament.format] ?? tournament.format}
              </span>
              {matches && matches.length > 0 && (
                <span className="text-[10px] font-semibold text-white/50">{matches.length} matches</span>
              )}
            </div>
            {tournament.description && (
              <p className="text-xs text-white/50 mt-2 leading-relaxed">{tournament.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 mb-4 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold border transition-all shrink-0",
              activeTab === tab.id
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Matches tab ── */}
      {activeTab === "matches" && (
        <div className="space-y-3 px-4">
          {mLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : sortedGroupKeys.length > 0 ? (
            sortedGroupKeys.map(key => (
              <div key={key} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                  {isGroupStage || isKnockout(fmt) ? (
                    <span className="text-xs font-black text-primary uppercase tracking-wide">{key}</span>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">{key}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {groupedMatches[key]?.length} matches
                  </span>
                </div>
                <div className="divide-y divide-border/50">
                  {groupedMatches[key]?.map((m, i) => <MatchRow key={m.id} match={m} index={i} />)}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No matches scheduled yet.
            </div>
          )}
        </div>
      )}

      {/* ── Teams tab ── */}
      {activeTab === "teams" && (
        <div className="px-4">
          {mLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : participatingTeams.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {participatingTeams.map(team => (
                <div key={team.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                  <TeamLogo
                    url={team.logoUrl ?? ""}
                    name={team.name}
                    shortName={team.shortName ?? team.name}
                    className="w-10 h-10 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{team.name}</p>
                    {team.shortName && team.shortName !== team.name && (
                      <p className="text-[10px] text-muted-foreground">{team.shortName}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No matches scheduled yet — teams will appear here once matches are added.
            </div>
          )}
        </div>
      )}

      {/* ── Bracket tab ── */}
      {activeTab === "bracket" && (
        <>
          {mLoading ? (
            <div className="px-4">
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : (
            <KnockoutBracket matches={bracketMatches} />
          )}
        </>
      )}

      {/* ── Standings tab ── */}
      {activeTab === "standings" && (
        <div className="space-y-3 px-4">
          {sLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : standings && Object.keys(standings.groups ?? {}).length > 0 ? (
            Object.entries(standings.groups).map(([groupName, rows]) => (
              <div key={groupName} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-black text-foreground uppercase tracking-wide">{groupName}</span>
                </div>
                <div className="px-3 pb-3 pt-2 overflow-x-auto">
                  <table className="w-full text-xs min-w-[340px]">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left font-semibold pb-2 w-6">#</th>
                        <th className="text-left font-semibold pb-2">Team</th>
                        <th className="text-center font-semibold pb-2 w-7">P</th>
                        <th className="text-center font-semibold pb-2 w-7">W</th>
                        <th className="text-center font-semibold pb-2 w-7">D</th>
                        <th className="text-center font-semibold pb-2 w-7">L</th>
                        <th className="text-center font-semibold pb-2 w-8">GD</th>
                        <th className="text-center font-semibold pb-2 w-8 text-primary">Pts</th>
                        <th className="text-center font-semibold pb-2">Form</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const guide = row.formGuide ?? [];
                        const empties = Math.max(0, 5 - guide.length);
                        return (
                        <tr
                          key={row.position}
                          className={cn(
                            "border-t border-border/30",
                            idx < 2 && standings.format === "group_stage" && "bg-primary/5"
                          )}
                        >
                          <td className="py-2 text-muted-foreground font-semibold">{row.position}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-1.5">
                              <TeamLogo
                                url={row.team.logoUrl}
                                name={row.team.name}
                                shortName={row.team.shortName}
                                className="w-4 h-4"
                              />
                              <span className="font-semibold text-foreground truncate max-w-[80px]">
                                {row.team.shortName || row.team.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 text-center text-muted-foreground">{row.played}</td>
                          <td className="py-2 text-center text-muted-foreground">{row.won}</td>
                          <td className="py-2 text-center text-muted-foreground">{row.drawn}</td>
                          <td className="py-2 text-center text-muted-foreground">{row.lost}</td>
                          <td className="py-2 text-center text-muted-foreground">
                            {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                          </td>
                          <td className="py-2 text-center font-black text-primary">{row.points}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-0.5 justify-center">
                              {Array.from({ length: empties }).map((_, j) => (
                                <span key={`e${j}`} className="w-4 h-4 rounded-full border border-white/15 inline-block" />
                              ))}
                              {guide.map((r, j) => <FormDot key={j} result={r} />)}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No finished matches yet — standings will appear here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
