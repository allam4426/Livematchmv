import { Router } from "express";
import { db, tournamentsTable, matchesTable, teamsTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import {
  CreateTournamentBody,
  UpdateTournamentBody,
  GetTournamentParams,
  UpdateTournamentParams,
  DeleteTournamentParams,
  GetTournamentStandingsParams,
} from "@workspace/api-zod";
import { alias } from "drizzle-orm/pg-core";

const router = Router();

router.get("/tournaments", async (req, res) => {
  const sport = req.query.sport as string | undefined;
  let rows = await db.select().from(tournamentsTable).orderBy(tournamentsTable.name);
  if (sport && sport !== "all") {
    rows = rows.filter(t => t.sport === sport);
  }
  res.json(rows);
});

router.post("/tournaments", async (req, res) => {
  const parsed = CreateTournamentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [t] = await db.insert(tournamentsTable).values(parsed.data).returning();
  res.status(201).json(t);
});

router.get("/tournaments/:id", async (req, res) => {
  const { id } = GetTournamentParams.parse({ id: Number(req.params.id) });
  const [t] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, id));
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  res.json(t);
});

router.patch("/tournaments/:id", async (req, res) => {
  const { id } = UpdateTournamentParams.parse({ id: Number(req.params.id) });
  const parsed = UpdateTournamentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [t] = await db.update(tournamentsTable).set(parsed.data).where(eq(tournamentsTable.id, id)).returning();
  if (!t) { res.status(404).json({ error: "Not found" }); return; }
  res.json(t);
});

router.delete("/tournaments/:id", async (req, res) => {
  const { id } = DeleteTournamentParams.parse({ id: Number(req.params.id) });
  await db.delete(tournamentsTable).where(eq(tournamentsTable.id, id));
  res.status(204).send();
});

router.get("/tournaments/:id/standings", async (req, res) => {
  const { id } = GetTournamentStandingsParams.parse({ id: Number(req.params.id) });

  const homeTeam = alias(teamsTable, "homeTeam");
  const awayTeam = alias(teamsTable, "awayTeam");

  const matches = await db
    .select({ match: matchesTable, homeTeam, awayTeam })
    .from(matchesTable)
    .innerJoin(homeTeam, eq(matchesTable.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matchesTable.awayTeamId, awayTeam.id))
    .where(and(eq(matchesTable.tournamentId, id), eq(matchesTable.status, "finished")));

  // Aggregate standings
  const teamMap = new Map<number, {
    team: typeof teamsTable.$inferSelect;
    played: number; won: number; drawn: number; lost: number;
    goalsFor: number; goalsAgainst: number; points: number;
  }>();

  for (const { match, homeTeam: ht, awayTeam: at } of matches) {
    if (!teamMap.has(ht.id)) teamMap.set(ht.id, { team: ht, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    if (!teamMap.has(at.id)) teamMap.set(at.id, { team: at, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });

    const h = teamMap.get(ht.id)!;
    const a = teamMap.get(at.id)!;
    h.played++; a.played++;
    h.goalsFor += match.homeScore; h.goalsAgainst += match.awayScore;
    a.goalsFor += match.awayScore; a.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      h.won++; h.points += 3; a.lost++;
    } else if (match.homeScore < match.awayScore) {
      a.won++; a.points += 3; h.lost++;
    } else {
      h.drawn++; h.points++; a.drawn++; a.points++;
    }
  }

  const standings = Array.from(teamMap.values())
    .sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
    .map((s, i) => ({
      position: i + 1,
      team: s.team,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDifference: s.goalsFor - s.goalsAgainst,
      points: s.points,
    }));

  res.json(standings);
});

export default router;
