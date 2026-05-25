import { useState } from "react";
import {
  useListMatches, useListMatchEvents, useCreateMatchEvent, useDeleteMatchEvent,
  useGetMatchLineup, getListMatchEventsQueryKey, getGetMatchLineupQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type EventType = "goal" | "yellow_card" | "red_card" | "own_goal" | "penalty_awarded" | "penalty_goal" | "penalty_missed" | "substitution" | "mvp";

const EVENT_TYPES: { type: EventType; label: string; icon: string; color: string }[] = [
  { type: "goal", label: "Goal", icon: "⚽", color: "bg-green-500/15 border-green-500/40 text-green-400" },
  { type: "yellow_card", label: "Yellow", icon: "🟨", color: "bg-yellow-500/15 border-yellow-500/40 text-yellow-400" },
  { type: "red_card", label: "Red", icon: "🟥", color: "bg-red-500/15 border-red-500/40 text-red-400" },
  { type: "own_goal", label: "Own Goal", icon: "⚽↩", color: "bg-orange-500/15 border-orange-500/40 text-orange-400" },
  { type: "penalty_awarded", label: "Penalty Awarded", icon: "P!", color: "bg-blue-500/15 border-blue-500/40 text-blue-400" },
  { type: "penalty_goal", label: "Penalty Goal", icon: "P⚽", color: "bg-green-500/15 border-green-500/40 text-green-400" },
  { type: "penalty_missed", label: "Missed", icon: "P✗", color: "bg-red-500/15 border-red-500/40 text-red-400" },
  { type: "substitution", label: "Sub", icon: "↕", color: "bg-purple-500/15 border-purple-500/40 text-purple-400" },
  { type: "mvp", label: "MVP", icon: "⭐", color: "bg-primary/15 border-primary/40 text-primary" },
];

const EVENT_ICONS: Record<string, string> = Object.fromEntries(EVENT_TYPES.map(e => [e.type, e.icon]));

const EMPTY_EVENT = { type: "goal" as EventType, minute: "", teamSide: "home" as "home" | "away", playerName: "", playerNumber: "", assistPlayerName: "", description: "", useLineup: false, lineupPlayerId: 0 };

export function EventsTab() {
  const qc = useQueryClient();
  const [selectedMatchId, setSelectedMatchId] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);
  const [ev, setEv] = useState({ ...EMPTY_EVENT });

  const { data: matches } = useListMatches({ status: "live", limit: 50 });
  const allMatches = useListMatches({ limit: 100 });

  const match = (allMatches.data ?? []).find(m => m.id === selectedMatchId);

  const { data: events, isLoading: evLoading } = useListMatchEvents(selectedMatchId, {
    query: { enabled: !!selectedMatchId, queryKey: getListMatchEventsQueryKey(selectedMatchId) }
  });

  const { data: lineup } = useGetMatchLineup(selectedMatchId, {
    query: { enabled: !!selectedMatchId, queryKey: getGetMatchLineupQueryKey(selectedMatchId) }
  });

  const createEvent = useCreateMatchEvent();
  const deleteEvent = useDeleteMatchEvent();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListMatchEventsQueryKey(selectedMatchId) });

  const teamId = ev.teamSide === "home" ? match?.homeTeam.id : match?.awayTeam.id;
  const lineupSide = ev.teamSide === "home" ? lineup?.home : lineup?.away;

  const handlePlayerSelect = (playerId: number) => {
    const player = lineupSide?.find(p => p.id === playerId);
    if (player) {
      setEv(e => ({ ...e, lineupPlayerId: playerId, playerName: player.playerName, playerNumber: player.playerNumber }));
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchId || !ev.type || !ev.minute || !ev.playerName || !teamId) return;
    createEvent.mutate({
      id: selectedMatchId,
      data: {
        type: ev.type,
        minute: ev.minute,
        teamId,
        playerName: ev.playerName,
        playerNumber: ev.playerNumber || undefined,
        assistPlayerName: ev.assistPlayerName || undefined,
        description: ev.description || undefined,
      }
    }, { onSuccess: () => { setEv({ ...EMPTY_EVENT }); setShowForm(false); invalidate(); } });
  };

  const handleDelete = (eventId: number) => {
    deleteEvent.mutate({ id: selectedMatchId, eventId }, { onSuccess: invalidate });
  };

  return (
    <div className="space-y-4">
      {/* Match selector */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1.5">Select Match</label>
        <select value={selectedMatchId} onChange={e => { setSelectedMatchId(Number(e.target.value)); setShowForm(false); }} className="admin-input">
          <option value={0}>— Choose match —</option>
          {(allMatches.data ?? []).map(m => (
            <option key={m.id} value={m.id}>
              {m.homeTeam.shortName} vs {m.awayTeam.shortName} · {m.competition} · {m.status === "live" ? `LIVE ${m.minute ?? ""}` : m.status}
            </option>
          ))}
        </select>
      </div>

      {selectedMatchId > 0 && (
        <>
          {/* Match info bar */}
          {match && (
            <div className="bg-card rounded-xl border border-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{match.homeTeam.shortName} {match.homeScore} – {match.awayScore} {match.awayTeam.shortName}</p>
                <p className="text-xs text-muted-foreground">{match.competition}</p>
              </div>
              <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border",
                match.status === "live" ? "text-red-400 bg-red-500/10 border-red-500/25" : "text-muted-foreground bg-muted/50 border-border"
              )}>
                {match.status === "live" ? `Live · ${match.minute ?? ""}` : match.status}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Match Log ({events?.length ?? 0})</p>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-primary text-white rounded-xl px-3 py-2 text-xs font-bold">
              {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showForm ? "Cancel" : "Add Event"}
            </button>
          </div>

          {/* Add event form */}
          {showForm && match && (
            <form onSubmit={handleAdd} className="bg-card border border-border rounded-xl p-4 space-y-4">
              {/* Event type picker */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-2">Event Type *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {EVENT_TYPES.map(et => (
                    <button key={et.type} type="button"
                      onClick={() => setEv(e => ({ ...e, type: et.type }))}
                      className={cn("rounded-xl border py-2 px-1.5 text-center transition-all",
                        ev.type === et.type ? et.color + " border-current" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30"
                      )}>
                      <div className="text-base leading-none mb-0.5">{et.icon}</div>
                      <div className="text-[9px] font-semibold leading-tight">{et.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Minute */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Minute *</label>
                  <input value={ev.minute} onChange={e => setEv(v => ({ ...v, minute: e.target.value }))}
                    placeholder="45' or 90+3'" className="admin-input" />
                </div>

                {/* Team side */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Team *</label>
                  <div className="flex gap-1.5">
                    {(["home", "away"] as const).map(side => (
                      <button key={side} type="button"
                        onClick={() => setEv(e => ({ ...e, teamSide: side, lineupPlayerId: 0, playerName: "", playerNumber: "" }))}
                        className={cn("flex-1 rounded-xl border py-2 text-xs font-bold capitalize transition-all",
                          ev.teamSide === side ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border"
                        )}>
                        {side === "home" ? match.homeTeam.shortName : match.awayTeam.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Player selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Player *</label>
                  <button type="button" onClick={() => setEv(e => ({ ...e, useLineup: !e.useLineup, lineupPlayerId: 0, playerName: "", playerNumber: "" }))}
                    className="text-[10px] font-semibold text-primary">
                    {ev.useLineup ? "Manual entry" : (lineupSide?.length ? "Choose from lineup" : "No lineup set")}
                  </button>
                </div>
                {ev.useLineup && lineupSide && lineupSide.length > 0 ? (
                  <select value={ev.lineupPlayerId} onChange={e => handlePlayerSelect(Number(e.target.value))} className="admin-input">
                    <option value={0}>— Select player —</option>
                    {lineupSide.map(p => (
                      <option key={p.id} value={p.id}>#{p.playerNumber} {p.playerName}{p.position ? ` (${p.position})` : ""}</option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <input value={ev.playerNumber} onChange={e => setEv(v => ({ ...v, playerNumber: e.target.value }))}
                        placeholder="#" className="admin-input text-center" />
                    </div>
                    <div className="col-span-2">
                      <input value={ev.playerName} onChange={e => setEv(v => ({ ...v, playerName: e.target.value }))}
                        placeholder="Player name" className="admin-input" />
                    </div>
                  </div>
                )}
              </div>

              {/* Assist (for goal types) */}
              {(ev.type === "goal" || ev.type === "penalty_goal") && (
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Assist Player</label>
                  <input value={ev.assistPlayerName} onChange={e => setEv(v => ({ ...v, assistPlayerName: e.target.value }))}
                    placeholder="Assist player name (optional)" className="admin-input" />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Note (optional)</label>
                <input value={ev.description} onChange={e => setEv(v => ({ ...v, description: e.target.value }))}
                  placeholder="e.g. VAR reviewed, contested tackle..." className="admin-input" />
              </div>

              <button type="submit" disabled={createEvent.isPending}
                className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
                {createEvent.isPending ? "Logging..." : "Log Event"}
              </button>
            </form>
          )}

          {/* Events list */}
          {evLoading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : events && events.length > 0 ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {events.map((event, i) => (
                <div key={event.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border/50")}>
                  <span className="text-xs font-black text-primary w-10 shrink-0">{event.minute}'</span>
                  <span className="text-base shrink-0">{EVENT_ICONS[event.type] ?? "•"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {event.playerNumber && <span className="text-muted-foreground mr-1">#{event.playerNumber}</span>}
                      {event.playerName}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {event.type.replace(/_/g, " ")}
                      {event.assistPlayerName && ` · Assist: ${event.assistPlayerName}`}
                      {event.description && ` · ${event.description}`}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(event.id)} className="text-muted-foreground hover:text-red-400 p-1 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm bg-card rounded-xl border border-dashed border-border">
              No events logged yet. Use the form above to add match events.
            </div>
          )}
        </>
      )}
    </div>
  );
}
