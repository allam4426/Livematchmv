import { useState } from "react";
import {
  useListMatches, useGetMatchLineup, useAddLineupPlayer, useRemoveLineupPlayer,
  getGetMatchLineupQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const POSITIONS = ["GK", "DEF", "MID", "FWD", "CB", "LB", "RB", "CDM", "CAM", "LW", "RW", "ST", "CF"];
const EMPTY = { teamSide: "home" as "home" | "away", playerNumber: "", playerName: "", position: "", isStarting: true };

export function LineupTab() {
  const qc = useQueryClient();
  const [selectedMatchId, setSelectedMatchId] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: allMatches } = useListMatches({ limit: 100 });
  const match = allMatches?.find(m => m.id === selectedMatchId);

  const { data: lineup, isLoading } = useGetMatchLineup(selectedMatchId, {
    query: { enabled: !!selectedMatchId, queryKey: getGetMatchLineupQueryKey(selectedMatchId) }
  });

  const addPlayer = useAddLineupPlayer();
  const removePlayer = useRemoveLineupPlayer();

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetMatchLineupQueryKey(selectedMatchId) });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchId || !form.playerName || !form.playerNumber) return;
    const teamId = form.teamSide === "home" ? match?.homeTeam.id : match?.awayTeam.id;
    if (!teamId) return;
    addPlayer.mutate({
      id: selectedMatchId,
      data: {
        teamId,
        playerNumber: form.playerNumber,
        playerName: form.playerName,
        position: form.position || undefined,
        isStarting: form.isStarting,
      }
    }, { onSuccess: () => { setForm({ ...EMPTY }); setShowForm(false); invalidate(); } });
  };

  const handleRemove = (playerId: number) => {
    removePlayer.mutate({ id: selectedMatchId, playerId }, { onSuccess: invalidate });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1.5">Select Match</label>
        <select value={selectedMatchId} onChange={e => { setSelectedMatchId(Number(e.target.value)); setShowForm(false); }} className="admin-input">
          <option value={0}>— Choose match —</option>
          {allMatches?.map(m => (
            <option key={m.id} value={m.id}>
              {m.homeTeam.shortName} vs {m.awayTeam.shortName} · {m.competition} · {m.status}
            </option>
          ))}
        </select>
      </div>

      {selectedMatchId > 0 && match && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {match.homeTeam.shortName} vs {match.awayTeam.shortName}
            </p>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-3 py-2 text-xs font-bold">
              {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm ? "Cancel" : "Add Player"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAdd} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-foreground">Add Player</p>

              {/* Team side */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1.5">Team *</label>
                <div className="flex gap-2">
                  {(["home", "away"] as const).map(side => (
                    <button key={side} type="button"
                      onClick={() => setForm(f => ({ ...f, teamSide: side }))}
                      className={cn("flex-1 rounded-xl border py-2 text-xs font-bold transition-all",
                        form.teamSide === side ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border"
                      )}>
                      {side === "home" ? match.homeTeam.name : match.awayTeam.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1"># *</label>
                  <input value={form.playerNumber} onChange={e => setForm(f => ({ ...f, playerNumber: e.target.value }))}
                    placeholder="10" className="admin-input text-center" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Name *</label>
                  <input value={form.playerName} onChange={e => setForm(f => ({ ...f, playerName: e.target.value }))}
                    placeholder="Player full name" className="admin-input" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Position</label>
                  <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="admin-input">
                    <option value="">—</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex items-center gap-2 mt-4">
                  <input type="checkbox" id="isStarting" checked={form.isStarting}
                    onChange={e => setForm(f => ({ ...f, isStarting: e.target.checked }))} className="w-4 h-4 rounded" />
                  <label htmlFor="isStarting" className="text-xs font-semibold text-muted-foreground">Starting XI</label>
                </div>
              </div>

              <button type="submit" disabled={addPlayer.isPending}
                className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
                {addPlayer.isPending ? "Adding..." : "Add to Lineup"}
              </button>
            </form>
          )}

          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {(["home", "away"] as const).map(side => {
                const players = side === "home" ? lineup?.home : lineup?.away;
                const team = side === "home" ? match.homeTeam : match.awayTeam;
                const starters = players?.filter(p => p.isStarting) ?? [];
                const subs = players?.filter(p => !p.isStarting) ?? [];
                return (
                  <div key={side} className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                      <p className="text-sm font-bold text-foreground">{team.name}</p>
                      <p className="text-[10px] text-muted-foreground">{starters.length} starters · {subs.length} subs</p>
                    </div>
                    {starters.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase px-4 pt-2 pb-1">Starting XI</p>
                        {starters.map((p, i) => (
                          <div key={p.id} className={cn("flex items-center gap-2.5 px-4 py-2", i > 0 && "border-t border-border/30")}>
                            <span className="text-xs font-black text-primary w-6 text-right shrink-0">#{p.playerNumber}</span>
                            <span className="text-xs font-semibold text-foreground flex-1">{p.playerName}</span>
                            {p.position && <span className="text-[9px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">{p.position}</span>}
                            <button onClick={() => handleRemove(p.id)} className="text-muted-foreground hover:text-red-400 p-0.5 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {subs.length > 0 && (
                      <div className="border-t border-border">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase px-4 pt-2 pb-1">Substitutes</p>
                        {subs.map((p, i) => (
                          <div key={p.id} className={cn("flex items-center gap-2.5 px-4 py-2", i > 0 && "border-t border-border/30")}>
                            <span className="text-xs font-black text-muted-foreground w-6 text-right shrink-0">#{p.playerNumber}</span>
                            <span className="text-xs font-medium text-muted-foreground flex-1">{p.playerName}</span>
                            {p.position && <span className="text-[9px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">{p.position}</span>}
                            <button onClick={() => handleRemove(p.id)} className="text-muted-foreground hover:text-red-400 p-0.5 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {(!players || players.length === 0) && (
                      <p className="px-4 py-6 text-xs text-muted-foreground text-center">No players added yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
