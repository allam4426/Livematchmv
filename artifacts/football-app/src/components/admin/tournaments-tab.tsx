import { useState } from "react";
import { useListTournaments, useCreateTournament, useDeleteTournament, useGetTournamentStandings, getListTournamentsQueryKey, getGetTournamentStandingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, X, Trophy, ChevronDown } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { cn } from "@/lib/utils";

type Sport = "football" | "futsal";
const EMPTY = { name: "", sport: "football" as Sport, season: "", logoUrl: "", description: "" };

export function TournamentsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: tournaments, isLoading } = useListTournaments();
  const createTournament = useCreateTournament();
  const deleteTournament = useDeleteTournament();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListTournamentsQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.season) return;
    createTournament.mutate({ data: { ...form } }, {
      onSuccess: () => { setForm({ ...EMPTY }); setShowForm(false); invalidate(); },
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this tournament?")) return;
    deleteTournament.mutate({ id }, { onSuccess: invalidate });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{tournaments?.length ?? 0} tournaments</p>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-3 py-2 text-xs font-bold">
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "Cancel" : "Add Tournament"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">New Tournament</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Premier League" className="admin-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Sport *</label>
              <select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value as Sport }))} className="admin-input">
                <option value="football">Football</option>
                <option value="futsal">Futsal</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Season *</label>
              <input value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))}
                placeholder="2024/25" className="admin-input" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Logo URL</label>
              <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://..." className="admin-input" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description" className="admin-input" />
            </div>
          </div>
          <button type="submit" disabled={createTournament.isPending}
            className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
            {createTournament.isPending ? "Adding..." : "Add Tournament"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : tournaments && tournaments.length > 0 ? (
        <div className="space-y-2">
          {tournaments.map(t => (
            <div key={t.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {t.logoUrl ? (
                    <img src={t.logoUrl} alt={t.name} className="w-6 h-6 object-contain" />
                  ) : (
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{t.sport} · {t.season}</p>
                </div>
                <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  className="text-muted-foreground hover:text-foreground p-1">
                  <ChevronDown className={cn("w-4 h-4 transition-transform", expandedId === t.id && "rotate-180")} />
                </button>
                <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {expandedId === t.id && <StandingsPanel tournamentId={t.id} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
          No tournaments yet. Create one above.
        </div>
      )}
    </div>
  );
}

function StandingsPanel({ tournamentId }: { tournamentId: number }) {
  const { data: standings, isLoading } = useGetTournamentStandings(tournamentId, {
    query: { enabled: true, queryKey: getGetTournamentStandingsQueryKey(tournamentId) }
  });

  if (isLoading) return <div className="px-4 pb-3"><Skeleton className="h-20 w-full rounded" /></div>;
  if (!standings?.length) return <p className="px-4 pb-3 text-xs text-muted-foreground">No finished matches yet — standings will appear here.</p>;

  return (
    <div className="border-t border-border px-4 pb-3 pt-2">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Standings</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left font-semibold pb-1 w-6">#</th>
            <th className="text-left font-semibold pb-1">Team</th>
            <th className="text-center font-semibold pb-1 w-8">P</th>
            <th className="text-center font-semibold pb-1 w-8">W</th>
            <th className="text-center font-semibold pb-1 w-8">D</th>
            <th className="text-center font-semibold pb-1 w-8">L</th>
            <th className="text-center font-semibold pb-1 w-8">GD</th>
            <th className="text-center font-semibold pb-1 w-8 text-primary">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map(row => (
            <tr key={row.position} className="border-t border-border/30">
              <td className="py-1.5 text-muted-foreground">{row.position}</td>
              <td className="py-1.5">
                <div className="flex items-center gap-1.5">
                  <TeamLogo url={row.team.logoUrl} name={row.team.name} shortName={row.team.shortName} className="w-4 h-4" />
                  <span className="font-semibold text-foreground truncate max-w-[80px]">{row.team.name}</span>
                </div>
              </td>
              <td className="py-1.5 text-center text-muted-foreground">{row.played}</td>
              <td className="py-1.5 text-center text-muted-foreground">{row.won}</td>
              <td className="py-1.5 text-center text-muted-foreground">{row.drawn}</td>
              <td className="py-1.5 text-center text-muted-foreground">{row.lost}</td>
              <td className="py-1.5 text-center text-muted-foreground">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
              <td className="py-1.5 text-center font-black text-primary">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
