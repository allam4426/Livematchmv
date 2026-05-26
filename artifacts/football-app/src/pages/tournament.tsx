import { useGetTournament, useGetTournamentStandings, useGetTournamentMatches, getGetTournamentQueryKey, getGetTournamentStandingsQueryKey, getGetTournamentMatchesQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/team-logo";
import { MatchRow } from "@/components/match-row";
import { Trophy, ChevronLeft, Calendar, Layers } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

const FORMAT_LABELS: Record<string, string> = {
  league: "League",
  group_stage: "Group Stage",
  knockout: "Knockout",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  live:     { label: "Live",     className: "bg-red-500/15 text-red-400 border-red-500/25" },
  ongoing:  { label: "Ongoing",  className: "bg-primary/15 text-primary border-primary/25" },
  upcoming: { label: "Upcoming", className: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  finished: { label: "Finished", className: "bg-muted text-muted-foreground border-border" },
};

export default function TournamentPage() {
  const { id } = useParams();
  const tournamentId = parseInt(id || "0", 10);
  const [activeTab, setActiveTab] = useState<"matches" | "standings">("matches");

  const { data: tournament, isLoading: tLoading } = useGetTournament(tournamentId, {
    query: { enabled: !!tournamentId, queryKey: getGetTournamentQueryKey(tournamentId) },
  });
  const { data: matches, isLoading: mLoading } = useGetTournamentMatches(tournamentId, {
    query: { enabled: !!tournamentId, queryKey: getGetTournamentMatchesQueryKey(tournamentId) },
  });
  const { data: standings, isLoading: sLoading } = useGetTournamentStandings(tournamentId, {
    query: { enabled: !!tournamentId && activeTab === "standings", queryKey: getGetTournamentStandingsQueryKey(tournamentId) },
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
        <Link href="/"><span className="text-primary text-sm font-semibold cursor-pointer">Back to Home</span></Link>
      </div>
    );
  }

  // Group matches
  const isGroupStage = tournament.format === "group_stage";
  const groupedMatches: Record<string, typeof matches> = {};
  if (matches) {
    for (const m of matches) {
      const key = (isGroupStage && m.matchGroup) ? m.matchGroup : format(new Date(m.kickoffAt), "EEEE, d MMMM yyyy");
      if (!groupedMatches[key]) groupedMatches[key] = [];
      groupedMatches[key]!.push(m);
    }
  }
  const sortedGroupKeys = Object.keys(groupedMatches).sort((a, b) => {
    if (isGroupStage) return a.localeCompare(b);
    const da = new Date(groupedMatches[a]![0]!.kickoffAt);
    const db2 = new Date(groupedMatches[b]![0]!.kickoffAt);
    return da.getTime() - db2.getTime();
  });

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
            <p className="text-sm text-white/60 mt-0.5 capitalize">{tournament.sport} · {tournament.season}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/15 text-white/80 px-2 py-0.5 rounded-full">
                <Layers className="w-3 h-3" />
                {FORMAT_LABELS[tournament.format] ?? tournament.format}
              </span>
              {matches && matches.length > 0 && (
                <span className="text-[10px] font-semibold text-white/50">
                  {matches.length} matches
                </span>
              )}
            </div>
            {tournament.description && (
              <p className="text-xs text-white/50 mt-2 leading-relaxed">{tournament.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex items-center gap-2 px-4 mb-4">
        {(["matches", "standings"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold border transition-all capitalize",
              activeTab === tab
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            )}>
            {tab === "matches" ? <Calendar className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Matches tab */}
      {activeTab === "matches" && (
        <div className="space-y-3 px-4">
          {mLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : sortedGroupKeys.length > 0 ? (
            sortedGroupKeys.map(key => (
              <div key={key} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                  {isGroupStage ? (
                    <span className="text-xs font-black text-primary uppercase tracking-wide">{key}</span>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">{key}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">{groupedMatches[key]?.length} matches</span>
                </div>
                <div className="divide-y divide-border/50">
                  {groupedMatches[key]?.map((m, i) => (
                    <MatchRow key={m.id} match={m} index={i} />
                  ))}
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

      {/* Standings tab */}
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
                        <th className="text-center font-semibold pb-2 w-8">GF</th>
                        <th className="text-center font-semibold pb-2 w-8">GA</th>
                        <th className="text-center font-semibold pb-2 w-8">GD</th>
                        <th className="text-center font-semibold pb-2 w-8 text-primary">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={row.position} className={cn("border-t border-border/30", idx < 2 && standings.format === "group_stage" && "bg-primary/5")}>
                          <td className="py-2 text-muted-foreground font-semibold">{row.position}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-1.5">
                              <TeamLogo url={row.team.logoUrl} name={row.team.name} shortName={row.team.shortName} className="w-4 h-4" />
                              <span className="font-semibold text-foreground truncate max-w-[90px]">{row.team.name}</span>
                            </div>
                          </td>
                          <td className="py-2 text-center text-muted-foreground">{row.played}</td>
                          <td className="py-2 text-center text-muted-foreground">{row.won}</td>
                          <td className="py-2 text-center text-muted-foreground">{row.drawn}</td>
                          <td className="py-2 text-center text-muted-foreground">{row.lost}</td>
                          <td className="py-2 text-center text-muted-foreground">{row.goalsFor}</td>
                          <td className="py-2 text-center text-muted-foreground">{row.goalsAgainst}</td>
                          <td className="py-2 text-center text-muted-foreground">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                          <td className="py-2 text-center font-black text-primary">{row.points}</td>
                        </tr>
                      ))}
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
