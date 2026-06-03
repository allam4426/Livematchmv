import { Router } from "express";
import { db, squadsTable, matchEventsTable, teamsTable } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";

const router = Router();

router.get("/teams/:id/squad", async (req, res) => {
  const teamId = Number(req.params.id);
  const squad = await db
    .select()
    .from(squadsTable)
    .where(eq(squadsTable.teamId, teamId))
    .orderBy(squadsTable.role, squadsTable.playerNumber);
  res.json(squad);
});

router.post("/teams/:id/squad", async (req, res) => {
  const teamId = Number(req.params.id);
  const { playerNumber, playerName, position, role, isStarting, photoUrl, nationality, bio } = req.body;
  if (!playerName) {
    res.status(400).json({ error: "playerName is required" });
    return;
  }
  const [player] = await db.insert(squadsTable).values({
    teamId,
    playerNumber: playerNumber ?? "",
    playerName,
    position: position || null,
    role: role || "player",
    isStarting: isStarting ?? true,
    photoUrl: photoUrl || null,
    nationality: nationality || null,
    bio: bio || null,
  }).returning();
  res.status(201).json(player);
});

router.patch("/teams/:id/squad/:playerId", async (req, res) => {
  const teamId = Number(req.params.id);
  const playerId = Number(req.params.playerId);
  const { playerNumber, playerName, position, role, isStarting, photoUrl, nationality, bio } = req.body;
  const [player] = await db
    .update(squadsTable)
    .set({
      ...(playerNumber !== undefined && { playerNumber }),
      ...(playerName !== undefined && { playerName }),
      ...(position !== undefined && { position }),
      ...(role !== undefined && { role }),
      ...(isStarting !== undefined && { isStarting }),
      ...(photoUrl !== undefined && { photoUrl: photoUrl || null }),
      ...(nationality !== undefined && { nationality: nationality || null }),
      ...(bio !== undefined && { bio: bio || null }),
    })
    .where(and(eq(squadsTable.id, playerId), eq(squadsTable.teamId, teamId)))
    .returning();
  if (!player) { res.status(404).json({ error: "Not found" }); return; }
  res.json(player);
});

router.delete("/teams/:id/squad/:playerId", async (req, res) => {
  const teamId = Number(req.params.id);
  const playerId = Number(req.params.playerId);
  await db.delete(squadsTable).where(
    and(eq(squadsTable.id, playerId), eq(squadsTable.teamId, teamId))
  );
  res.status(204).send();
});

router.get("/squad/:playerId", async (req, res) => {
  const playerId = Number(req.params.playerId);
  const [player] = await db.select().from(squadsTable).where(eq(squadsTable.id, playerId));
  if (!player) { res.status(404).json({ error: "Not found" }); return; }
  res.json(player);
});

router.get("/squad/:playerId/stats", async (req, res) => {
  const playerId = Number(req.params.playerId);
  const [player] = await db.select().from(squadsTable).where(eq(squadsTable.id, playerId));
  if (!player) { res.status(404).json({ error: "Not found" }); return; }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, player.teamId));

  const events = await db
    .select()
    .from(matchEventsTable)
    .where(eq(matchEventsTable.teamId, player.teamId));

  const playerEvents = events.filter(
    e => e.playerName === player.playerName
  );
  const assistEvents = events.filter(
    e => e.assistPlayerName === player.playerName
  );

  const goals = playerEvents.filter(e => e.type === "goal" || e.type === "penalty_goal").length;
  const ownGoals = playerEvents.filter(e => e.type === "own_goal").length;
  const yellowCards = playerEvents.filter(e => e.type === "yellow_card").length;
  const redCards = playerEvents.filter(e => e.type === "red_card").length;
  const assists = assistEvents.filter(e => e.type === "goal" || e.type === "penalty_goal").length;

  const matchIds = new Set(playerEvents.map(e => e.matchId));
  const appearances = matchIds.size;

  res.json({
    player,
    team: team ? { id: team.id, name: team.name, shortName: team.shortName, logoUrl: team.logoUrl } : null,
    goals,
    assists,
    yellowCards,
    redCards,
    ownGoals,
    appearances,
  });
});

// GET /players — all squad players across all teams with team info
router.get("/players", async (req, res) => {
  const sport = req.query.sport as string | undefined;
  const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;
  const q = req.query.q as string | undefined;

  const rows = await db
    .select({
      id: squadsTable.id,
      teamId: squadsTable.teamId,
      playerNumber: squadsTable.playerNumber,
      playerName: squadsTable.playerName,
      position: squadsTable.position,
      role: squadsTable.role,
      isStarting: squadsTable.isStarting,
      photoUrl: squadsTable.photoUrl,
      nationality: squadsTable.nationality,
      teamName: teamsTable.name,
      teamShortName: teamsTable.shortName,
      teamLogoUrl: teamsTable.logoUrl,
      teamSport: teamsTable.sport,
    })
    .from(squadsTable)
    .innerJoin(teamsTable, eq(squadsTable.teamId, teamsTable.id))
    .orderBy(squadsTable.playerName);

  let result = rows.filter(p => p.role !== "coach");
  if (sport && sport !== "all") result = result.filter(r => r.teamSport === sport);
  if (teamId) result = result.filter(r => r.teamId === teamId);
  if (q) {
    const lq = q.toLowerCase();
    result = result.filter(r =>
      r.playerName.toLowerCase().includes(lq) ||
      r.teamName.toLowerCase().includes(lq) ||
      (r.nationality ?? "").toLowerCase().includes(lq)
    );
  }

  res.json(result);
});

export default router;
