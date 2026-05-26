import { pgTable, serial, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tournamentsTable = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sport: text("sport").notNull().default("football"),
  season: text("season").notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  format: text("format").notNull().default("league"),
});

export const insertTournamentSchema = createInsertSchema(tournamentsTable).omit({ id: true });
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournamentsTable.$inferSelect;
