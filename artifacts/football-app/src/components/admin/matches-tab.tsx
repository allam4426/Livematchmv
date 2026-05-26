import { useState } from "react";
import {
  useListMatches, useCreateMatch, useUpdateMatch, useDeleteMatch,
  useListTeams, useListTournaments, useAutoFillLineup,
  getListMatchesQueryKey, Match
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, X, Pencil, Check, Users } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Sport = "football" | "futsal";
type Status = "scheduled" | "live" | "finished" | "postponed";

const STATUSES: Status[] = ["scheduled", "live", "finished", "postponed"];
const STATUS_COLORS: Record<Status, string> = {
  live: "text-red-400 bg-red-500/10 border-red-500/25",
  scheduled: "text-blue-400 bg-blue-500/10 border-blue-500/25",
  finished: "text-muted-foreground bg-muted/50 border-border",
  postponed: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",
};

const EMPTY_FORM = {
  homeTeamId: 0, awayTeamId: 0, competition: "", kickoffAt: "",
  sport: "football" as Sport, tournamentId: 0, venue: "",
  homeScore: 0, awayScore: 0, status: "scheduled" as Status, minute: "", featured: false,
  matchGroup: "",
};

export function MatchesTab() {
  const qc = useQueryClient();
  const [sport, setSport] = useState<"all" | Sport>("all");
  const [showForm, setShowForm] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [autoFillPending, setAutoFillPending] = useState<number | null>(null);
  const [autoFillMsg, setAutoFillMsg] = useState<{ id: number; msg: string } | null>(null);

  const { data: matches, isLoading } = useListMatches(sport === "all" ? undefined : { sport });
  const { data: teams } = useListTeams();
  const { data: tournaments } = useListTournaments();
  const createMatch = useCreateMatch();
  const updateMatch = useUpdateMatch();
  const deleteMatch = useDeleteMatch();
  const autoFill = useAutoFillLineup();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListMatchesQueryKey() });

  const filteredTeams = teams?.filter(t => sport === "all" || t.sport === sport);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.homeTeamId || !form.awayTeamId || !form.competition || !form.kickoffAt) return;
    createMatch.mutate({
      data: {
        ...form,
        kickoffAt: new Date(form.kickoffAt).toISOString(),
        tournamentId: form.tournamentId || undefined,
        minute: form.minute || undefined,
        venue: form.venue || undefined,
        matchGroup: form.matchGroup || undefined,
      }
    }, { onSuccess: () => { setForm({ ...EMPTY_FORM }); setShowForm(false); invalidate(); } });
  };

  const handleUpdate = (id: number) => {
    updateMatch.mutate({
      id,
      data: {
        homeScore: editMatch?.homeScore ?? 0,
        awayScore: editMatch?.awayScore ?? 0,
        status: editMatch?.status as Status,
        minute: editMatch?.minute || undefined,
        featured: editMatch?.featured ?? false,
      }
    }, { onSuccess: () => { setEditMatch(null); invalidate(); } });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this match?")) return;
    deleteMatch.mutate({ id }, { onSuccess: invalidate });
  };

  const handleAutoFill = (matchId: number) => {
    setAutoFillPending(matchId);
    autoFill.mutate({ id: matchId }, {
      onSuccess: (data) => {
        const total = (data.home?.length ?? 0) + (data.away?.length ?? 0);
        setAutoFillMsg({ id: matchId, msg: `✓ ${total} players added to lineup` });
        setTimeout(() => setAutoFillMsg(null), 3000);
      },
      onError: () => setAutoFillMsg({ id: matchId, msg: "Failed — make sure both teams have a squad." }),
      onSettled: () => setAutoFillPending(null),
    });
  };

  const teamName = (id: number) => teams?.find(t => t.id === id)?.name ?? id.toString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {(["all", "football", "futsal"] as const).map(s => (
            <button key={s} onClick={() => setSport(s)}
              className={cn("rounded-full px-3 py-1 text-xs font-semibold border transition-all capitalize",
                sport === s ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border"
              )}>{s}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-3 py-2 text-xs font-bold">
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? "Cancel" : "Add Match"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">New Match</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Sport *</label>
              <select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value as Sport }))} className="admin-input">
                <option value="football">Football</option>
                <option value="futsal">Futsal</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Tournament</label>
              <select value={form.tournamentId} onChange={e => setForm(f => ({ ...f, tournamentId: Number(e.target.value) }))} className="admin-input">
                <option value={0}>— None —</option>
                {tournaments?.filter(t => t.sport === form.sport).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.season})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Home Team *</label>
              <select value={form.homeTeamId} onChange={e => setForm(f => ({ ...f, homeTeamId: Number(e.target.value) }))} className="admin-input">
                <option value={0}>Select team</option>
                {filteredTeams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Away Team *</label>
              <select value={form.awayTeamId} onChange={e => setForm(f => ({ ...f, awayTeamId: Number(e.target.value) }))} className="admin-input">
                <option value={0}>Select team</option>
                {filteredTeams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Competition *</label>
              <input value={form.competition} onChange={e => setForm(f => ({ ...f, competition: e.target.value }))}
                placeholder="e.g. Premier League" className="admin-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Kickoff *</label>
              <input type="datetime-local" value={form.kickoffAt} onChange={e => setForm(f => ({ ...f, kickoffAt: e.target.value }))} className="admin-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))} className="admin-input">
                {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Venue</label>
              <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                placeholder="Wembley Stadium" className="admin-input" />
            </div>
            {tournaments?.find(t => t.id === form.tournamentId)?.format === "group_stage" && (
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Group</label>
                <input value={form.matchGroup} onChange={e => setForm(f => ({ ...f, matchGroup: e.target.value }))}
                  placeholder="Group A" className="admin-input" />
              </div>
            )}
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="featured" checked={form.featured}
                onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
                className="w-4 h-4 rounded" />
              <label htmlFor="featured" className="text-xs font-semibold text-muted-foreground">Featured match</label>
            </div>
          </div>
          <button type="submit" disabled={createMatch.isPending}
            className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
            {createMatch.isPending ? "Adding..." : "Add Match"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : matches && matches.length > 0 ? (
        <div className="space-y-2">
          {matches.map(m => (
            <div key={m.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize", STATUS_COLORS[m.status as Status])}>
                      {m.status === "live" && m.minute ? `Live · ${m.minute}` : m.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">{m.sport}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamLogo url={m.homeTeam.logoUrl} name={m.homeTeam.name} shortName={m.homeTeam.shortName} className="w-5 h-5" />
                    <span className="text-sm font-bold text-foreground">{m.homeTeam.shortName}</span>
                    <span className="text-sm font-black text-muted-foreground">{m.homeScore}–{m.awayScore}</span>
                    <span className="text-sm font-bold text-foreground">{m.awayTeam.shortName}</span>
                    <TeamLogo url={m.awayTeam.logoUrl} name={m.awayTeam.name} shortName={m.awayTeam.shortName} className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{m.competition} · {format(new Date(m.kickoffAt), "d MMM HH:mm")}</p>
                </div>
                <button
                  onClick={() => handleAutoFill(m.id)}
                  disabled={autoFillPending === m.id}
                  title="Auto-fill lineup from squads"
                  className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-primary border border-border hover:border-primary/50 bg-muted/30 rounded-lg px-2 py-1 transition-all disabled:opacity-40">
                  <Users className="w-3.5 h-3.5" />
                  {autoFillPending === m.id ? "..." : "Auto"}
                </button>
                <button onClick={() => setEditMatch(editMatch?.id === m.id ? null : m)}
                  className="text-muted-foreground hover:text-primary p-1 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-red-400 p-1 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Auto-fill feedback */}
              {autoFillMsg?.id === m.id && (
                <div className="border-t border-border/50 px-4 py-2 bg-muted/20 text-[10px] font-semibold text-muted-foreground">
                  {autoFillMsg.msg}
                </div>
              )}

              {/* Inline edit panel */}
              {editMatch?.id === m.id && (
                <div className="border-t border-border px-4 pb-4 pt-3 bg-muted/20 space-y-3">
                  <p className="text-xs font-bold text-foreground">Quick Update</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Home Score</label>
                      <input type="number" min={0} value={editMatch.homeScore}
                        onChange={e => setEditMatch(em => em ? { ...em, homeScore: Number(e.target.value) } : em)}
                        className="admin-input text-center" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Away Score</label>
                      <input type="number" min={0} value={editMatch.awayScore}
                        onChange={e => setEditMatch(em => em ? { ...em, awayScore: Number(e.target.value) } : em)}
                        className="admin-input text-center" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Minute</label>
                      <input value={editMatch.minute ?? ""}
                        onChange={e => setEditMatch(em => em ? { ...em, minute: e.target.value } : em)}
                        placeholder="45'" className="admin-input text-center" />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Status</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {STATUSES.map(s => (
                          <button key={s} type="button"
                            onClick={() => setEditMatch(em => em ? { ...em, status: s } : em)}
                            className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold border capitalize transition-all",
                              editMatch.status === s ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border"
                            )}>{s}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleUpdate(m.id)} disabled={updateMatch.isPending}
                    className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50">
                    <Check className="w-3.5 h-3.5" />
                    {updateMatch.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
          No matches. Add one above.
        </div>
      )}
    </div>
  );
}
