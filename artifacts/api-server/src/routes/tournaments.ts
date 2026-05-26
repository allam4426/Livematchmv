import { Router } from "express";
import { db, tournamentsTable, matchesTable, teamsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
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

// IMPORTANT: /tournaments/active must be BEFORE /tournaments/:id
router.get("/tournaments/active", async (req, res) => {
  const sport = req.query.sport as string | undefined;
  let tournaments = await db.select().from(tournamentsTable).orderBy(tournamentsTable.name);
  if (sport && sport !== "all") {
    tournaments = tournaments.filter(t => t.sport === sport);
  }

  const homeTeam = alias(teamsTable, "homeTeam");
  const awayTeam = alias(teamsTable, "awayTeam");

  const results = await Promise.all(tournaments.map(async (t) => {
    const allMatches = await db
      .select({ match: matchesTable, homeTeam, awayTeam })
      .from(matchesTable)
      .innerJoin(homeTeam, eq(matchesTable.homeTeamId, homeTeam.id))
      .innerJoin(awayTeam, eq(matchesTable.awayTeamId, awayTeam.id))
      .where(eq(matchesTable.tournamentId, t.id));

    const total = allMatches.length;
    const liveCount = allMatches.filter(m => m.match.status === "live").length;
    const scheduledCount = allMatches.filter(m => m.match.status === "scheduled").length;
    const finishedCount = allMatches.filter(m => m.match.status === "finished").length;

    let matchStatus: "live" | "ongoing" | "upcoming" | "finished";
    if (liveCount > 0) matchStatus = "live";
    else if (scheduledCount > 0 && finishedCount > 0) matchStatus = "ongoing";
    else if (scheduledCount > 0) matchStatus = "upcoming";
    else matchStatus = "finished";

    return {
      ...t,
      matchStatus,
      matchCount: total,
      liveCount,
    };
  }));

  // Only return tournaments that have at least one match
  res.json(results.filter(r => r.matchCount > 0));
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

router.get("/tournaments/:id/matches", async (req, res) => {
  const id = Number(req.params.id);
  const homeTeam = alias(teamsTable, "homeTeam");
  const awayTeam = alias(teamsTable, "awayTeam");

  const rows = await db
    .select({ match: matchesTable, homeTeam, awayTeam })
    .from(matchesTable)
    .innerJoin(homeTeam, eq(matchesTable.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matchesTable.awayTeamId, awayTeam.id))
    .where(eq(matchesTable.tournamentId, id))
    .orderBy(matchesTable.kickoffAt);

  res.json(rows.map(row => ({
    id: row.match.id,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    homeScore: row.match.homeScore,
    awayScore: row.match.awayScore,
    status: row.match.status,
    minute: row.match.minute,
    competition: row.match.competition,
    competitionLogo: row.match.competitionLogo,
    kickoffAt: row.match.kickoffAt.toISOString(),
    streamCount: 0,
    featured: row.match.featured,
    sport: row.match.sport ?? "football",
    tournamentId: row.match.tournamentId,
    venue: row.match.venue,
    matchGroup: row.match.matchGroup,
  })));
});

function computeStandings(matches: Array<{
  match: typeof matchesTable.$inferSelect;
  homeTeam: typeof teamsTable.$inferSelect;
  awayTeam: typeof teamsTable.$inferSelect;
}>) {
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
    if (match.homeScore > match.awayScore) { h.won++; h.points += 3; a.lost++; }
    else if (match.homeScore < match.awayScore) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; h.points++; a.drawn++; a.points++; }
  }

  return Array.from(teamMap.values())
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
}

router.get("/tournaments/:id/standings", async (req, res) => {
  const { id } = GetTournamentStandingsParams.parse({ id: Number(req.params.id) });

  const [tournament] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, id));
  if (!tournament) { res.status(404).json({ error: "Not found" }); return; }

  const homeTeam = alias(teamsTable, "homeTeam");
  const awayTeam = alias(teamsTable, "awayTeam");

  const allMatches = await db
    .select({ match: matchesTable, homeTeam, awayTeam })
    .from(matchesTable)
    .innerJoin(homeTeam, eq(matchesTable.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matchesTable.awayTeamId, awayTeam.id))
    .where(and(eq(matchesTable.tournamentId, id), eq(matchesTable.status, "finished")));

  const format = tournament.format ?? "league";

  // Check if any match has a group assigned
  const hasGroups = allMatches.some(m => m.match.matchGroup);

  if (format === "group_stage" || hasGroups) {
    // Group by matchGroup
    const grouped = new Map<string, typeof allMatches>();
    for (const m of allMatches) {
      const grp = m.match.matchGroup ?? "Ungrouped";
      if (!grouped.has(grp)) grouped.set(grp, []);
      grouped.get(grp)!.push(m);
    }

    // Sort groups alphabetically
    const sortedGroups = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
    const groups: Record<string, ReturnType<typeof computeStandings>> = {};
    for (const [grp, matches] of sortedGroups) {
      groups[grp] = computeStandings(matches);
    }

    res.json({ format: "group_stage", groups });
  } else {
    // Single league table
    const standings = computeStandings(allMatches);
    res.json({ format, groups: { "League": standings } });
  }
});

export default router;
