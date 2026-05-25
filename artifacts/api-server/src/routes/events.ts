import { Router } from "express";
import { db, matchEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateMatchEventBody, UpdateMatchEventBody } from "@workspace/api-zod";

const router = Router();

router.get("/matches/:id/events", async (req, res) => {
  const matchId = Number(req.params.id);
  const events = await db
    .select()
    .from(matchEventsTable)
    .where(eq(matchEventsTable.matchId, matchId))
    .orderBy(matchEventsTable.minute);
  res.json(events);
});

router.post("/matches/:id/events", async (req, res) => {
  const matchId = Number(req.params.id);
  const parsed = CreateMatchEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db.insert(matchEventsTable).values({
    matchId,
    ...parsed.data,
  }).returning();
  res.status(201).json(event);
});

router.patch("/matches/:id/events/:eventId", async (req, res) => {
  const matchId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  const parsed = UpdateMatchEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db
    .update(matchEventsTable)
    .set(parsed.data)
    .where(and(eq(matchEventsTable.id, eventId), eq(matchEventsTable.matchId, matchId)))
    .returning();
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(event);
});

router.delete("/matches/:id/events/:eventId", async (req, res) => {
  const matchId = Number(req.params.id);
  const eventId = Number(req.params.eventId);
  await db.delete(matchEventsTable).where(
    and(eq(matchEventsTable.id, eventId), eq(matchEventsTable.matchId, matchId))
  );
  res.status(204).send();
});

export default router;
