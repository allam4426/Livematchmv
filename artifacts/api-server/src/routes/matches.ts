import { Router } from "express";
import { db, matchesTable, teamsTable, streamsTable, matchEventsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import {
  CreateMatchBody,
  UpdateMatchBody,
  GetMatchParams,
  UpdateMatchParams,
  DeleteMatchParams,
  ListMatchesQueryParams,
} from "@workspace/api-zod";
import { alias } from "drizzle-orm/pg-core";

const router = Router();

function buildMatch(row: {
  match: typeof matchesTable.$inferSelect;
  homeTeam: typeof teamsTable.$inferSelect;
  awayTeam: typeof teamsTable.$inferSelect;
  streamCount: number;
}) {
  return {
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
    streamCount: row.streamCount,
    featured: row.match.featured,
  };
}

async function getMatchesWithTeams(whereClause?: Parameters<typeof db.select>[0]) {
  const homeTeam = alias(teamsTable, "homeTeam");
  const awayTeam = alias(teamsTable, "awayTeam");

  const rows = await db
    .select({ match: matchesTable, homeTeam, awayTeam })
    .from(matchesTable)
    .innerJoin(homeTeam, eq(matchesTable.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matchesTable.awayTeamId, awayTeam.id))
    .orderBy(desc(matchesTable.kickoffAt));

  const matchIds = rows.map(r => r.match.id);
  const streamCounts = matchIds.length > 0
    ? await db
        .select({ matchId: streamsTable.matchId, count: count() })
        .from(streamsTable)
        .groupBy(streamsTable.matchId)
    : [];

  const streamCountMap = new Map(streamCounts.map(s => [s.matchId, Number(s.count)]));

  return rows.map(row => buildMatch({ ...row, streamCount: streamCountMap.get(row.match.id) ?? 0 }));
}

router.get("/matches", async (req, res) => {
  const params = ListMatchesQueryParams.safeParse({
    status: req.query.status,
    competition: req.query.competition,
    limit: req.query.limit ? Number(req.query.limit) : 50,
  });

  const homeTeam = alias(teamsTable, "homeTeam");
  const awayTeam = alias(teamsTable, "awayTeam");

  const conditions = [];
  if (params.success && params.data.status && params.data.status !== "all") {
    conditions.push(eq(matchesTable.status, params.data.status));
  }
  if (params.success && params.data.competition) {
    conditions.push(eq(matchesTable.competition, params.data.competition));
  }

  const rows = await db
    .select({ match: matchesTable, homeTeam, awayTeam })
    .from(matchesTable)
    .innerJoin(homeTeam, eq(matchesTable.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matchesTable.awayTeamId, awayTeam.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(matchesTable.kickoffAt))
    .limit(params.success ? (params.data.limit ?? 50) : 50);

  const matchIds = rows.map(r => r.match.id);
  const streamCounts = matchIds.length > 0
    ? await db.select({ matchId: streamsTable.matchId, cnt: count() }).from(streamsTable).groupBy(streamsTable.matchId)
    : [];
  const streamCountMap = new Map(streamCounts.map(s => [s.matchId, Number(s.cnt)]));

  res.json(rows.map(row => buildMatch({ ...row, streamCount: streamCountMap.get(row.match.id) ?? 0 })));
});

router.post("/matches", async (req, res) => {
  const parsed = CreateMatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { homeTeamId, awayTeamId, homeScore, awayScore, status, minute, competition, competitionLogo, kickoffAt, featured } = parsed.data;
  const [match] = await db.insert(matchesTable).values({
    homeTeamId,
    awayTeamId,
    homeScore: homeScore ?? 0,
    awayScore: awayScore ?? 0,
    status: status ?? "scheduled",
    minute: (minute && minute !== "null") ? minute : null,
    competition,
    competitionLogo: competitionLogo ?? null,
    kickoffAt: new Date(kickoffAt),
    featured: featured ?? false,
  }).returning();

  const homeTeam = alias(teamsTable, "homeTeam");
  const awayTeam = alias(teamsTable, "awayTeam");
  const [row] = await db
    .select({ match: matchesTable, homeTeam, awayTeam })
    .from(matchesTable)
    .innerJoin(homeTeam, eq(matchesTable.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matchesTable.awayTeamId, awayTeam.id))
    .where(eq(matchesTable.id, match.id));

  res.status(201).json(buildMatch({ ...row, streamCount: 0 }));
});

router.get("/matches/live", async (req, res) => {
  const homeTeam = alias(teamsTable, "homeTeam");
  const awayTeam = alias(teamsTable, "awayTeam");

  const rows = await db
    .select({ match: matchesTable, homeTeam, awayTeam })
    .from(matchesTable)
    .innerJoin(homeTeam, eq(matchesTable.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matchesTable.awayTeamId, awayTeam.id))
    .where(eq(matchesTable.status, "live"))
    .orderBy(desc(matchesTable.kickoffAt));

  const matchIds = rows.map(r => r.match.id);
  const streamCounts = matchIds.length > 0
    ? await db.select({ matchId: streamsTable.matchId, cnt: count() }).from(streamsTable).groupBy(streamsTable.matchId)
    : [];
  const streamCountMap = new Map(streamCounts.map(s => [s.matchId, Number(s.cnt)]));

  res.json(rows.map(row => buildMatch({ ...row, streamCount: streamCountMap.get(row.match.id) ?? 0 })));
});

router.get("/matches/:id", async (req, res) => {
  const { id } = GetMatchParams.parse({ id: Number(req.params.id) });

  const homeTeam = alias(teamsTable, "homeTeam");
  const awayTeam = alias(teamsTable, "awayTeam");

  const [row] = await db
    .select({ match: matchesTable, homeTeam, awayTeam })
    .from(matchesTable)
    .innerJoin(homeTeam, eq(matchesTable.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matchesTable.awayTeamId, awayTeam.id))
    .where(eq(matchesTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const [streams, events] = await Promise.all([
    db.select().from(streamsTable).where(eq(streamsTable.matchId, id)),
    db.select().from(matchEventsTable).where(eq(matchEventsTable.matchId, id)).orderBy(matchEventsTable.minute),
  ]);

  res.json({
    ...buildMatch({ ...row, streamCount: streams.length }),
    streams,
    events: events.map(e => ({
      id: e.id,
      type: e.type,
      minute: e.minute,
      teamId: e.teamId,
      playerName: e.playerName,
      assistPlayerName: e.assistPlayerName,
    })),
  });
});

router.patch("/matches/:id", async (req, res) => {
  const { id } = UpdateMatchParams.parse({ id: Number(req.params.id) });
  const parsed = UpdateMatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [match] = await db.update(matchesTable).set(parsed.data).where(eq(matchesTable.id, id)).returning();
  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const homeTeam = alias(teamsTable, "homeTeam");
  const awayTeam = alias(teamsTable, "awayTeam");
  const [row] = await db
    .select({ match: matchesTable, homeTeam, awayTeam })
    .from(matchesTable)
    .innerJoin(homeTeam, eq(matchesTable.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matchesTable.awayTeamId, awayTeam.id))
    .where(eq(matchesTable.id, id));

  const [sc] = await db.select({ cnt: count() }).from(streamsTable).where(eq(streamsTable.matchId, id));
  res.json(buildMatch({ ...row, streamCount: Number(sc.cnt) }));
});

router.delete("/matches/:id", async (req, res) => {
  const { id } = DeleteMatchParams.parse({ id: Number(req.params.id) });
  await db.delete(matchesTable).where(eq(matchesTable.id, id));
  res.status(204).send();
});

export default router;
