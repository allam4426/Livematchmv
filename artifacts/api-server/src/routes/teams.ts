import { Router } from "express";
import { db, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateTeamBody, UpdateTeamBody, GetTeamParams, UpdateTeamParams, DeleteTeamParams } from "@workspace/api-zod";

const router = Router();

router.get("/teams", async (req, res) => {
  const teams = await db.select().from(teamsTable).orderBy(teamsTable.name);
  res.json(teams);
});

router.post("/teams", async (req, res) => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [team] = await db.insert(teamsTable).values(parsed.data).returning();
  res.status(201).json(team);
});

router.get("/teams/:id", async (req, res) => {
  const { id } = GetTeamParams.parse({ id: Number(req.params.id) });
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(team);
});

router.patch("/teams/:id", async (req, res) => {
  const { id } = UpdateTeamParams.parse({ id: Number(req.params.id) });
  const parsed = UpdateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [team] = await db.update(teamsTable).set(parsed.data).where(eq(teamsTable.id, id)).returning();
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(team);
});

router.delete("/teams/:id", async (req, res) => {
  const { id } = DeleteTeamParams.parse({ id: Number(req.params.id) });
  await db.delete(teamsTable).where(eq(teamsTable.id, id));
  res.status(204).send();
});

export default router;
