import { Router } from "express";
import { db, teamsTable, matchesTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { CreateTeamBody, UpdateTeamBody, GetTeamParams, UpdateTeamParams, DeleteTeamParams } from "@workspace/api-zod";

const router = Router();

router.get("/teams", async (req, res) => {
  const sport = req.query.sport as string | undefined;
  let teams = await db.select().from(teamsTable).orderBy(teamsTable.name);
  if (sport && sport !== "all") {
    teams = teams.filter(t => t.sport === sport);
  }
  res.json(teams);
});

router.post("/teams", async (req, res) => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [team] = await db.insert(teamsTable).values({
    ...parsed.data,
    logoUrl: parsed.data.logoUrl ?? "",
  }).returning();
  res.status(201).json(team);
});

router.get("/teams/:id/form", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }

  // Last 5 finished matches for this team across all competitions, newest first
  const finished = await db
    .select()
    .from(matchesTable)
    .where(
      or(eq(matchesTable.homeTeamId, id), eq(matchesTable.awayTeamId, id))
    )
    .orderBy(desc(matchesTable.kickoffAt))
    .limit(50);

  const finishedOnly = finished.filter(m => m.status === "finished").slice(0, 5);

  // Reverse so oldest is first (left-to-right reading order)
  const form = finishedOnly.reverse().map(m => {
    const isHome = m.homeTeamId === id;
    const scored = isHome ? m.homeScore : m.awayScore;
    const conceded = isHome ? m.awayScore : m.homeScore;
    if (scored > conceded) return "W" as const;
    if (scored < conceded) return "L" as const;
    return "D" as const;
  });

  res.json({ teamId: id, form });
});

router.get("/teams/:id", async (req, res) => {
  const { id } = GetTeamParams.parse({ id: Number(req.params.id) });
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  res.json(team);
});

router.patch("/teams/:id", async (req, res) => {
  const { id } = UpdateTeamParams.parse({ id: Number(req.params.id) });
  const parsed = UpdateTeamBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [team] = await db.update(teamsTable).set(parsed.data).where(eq(teamsTable.id, id)).returning();
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  res.json(team);
});

router.delete("/teams/:id", async (req, res) => {
  const { id } = DeleteTeamParams.parse({ id: Number(req.params.id) });
  await db.delete(teamsTable).where(eq(teamsTable.id, id));
  res.status(204).send();
});

export default router;
