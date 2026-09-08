import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const projectStatusEnum = pgEnum("project_status", [
  "interview",
  "beats",
  "generating",
  "ready",
]);

export const panelStatusEnum = pgEnum("panel_status", [
  "pending",
  "generating",
  "done",
  "failed",
]);

export const imageProviderEnum = pgEnum("image_provider", ["openai", "gemini"]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull(),
  title: text("title").notNull().default("Untitled Story"),
  slug: text("slug").notNull().unique(),
  status: projectStatusEnum("status").notNull().default("interview"),
  imageProvider: imageProviderEnum("image_provider"),
  interviewAnswers: jsonb("interview_answers").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const beats = pgTable("beats", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  visualPrompt: text("visual_prompt").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const panels = pgTable("panels", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  beatId: uuid("beat_id")
    .notNull()
    .references(() => beats.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  status: panelStatusEnum("status").notNull().default("pending"),
  imageUrl: text("image_url"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const exports = pgTable("exports", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  beats: many(beats),
  panels: many(panels),
  exports: many(exports),
}));

export const beatsRelations = relations(beats, ({ one, many }) => ({
  project: one(projects, {
    fields: [beats.projectId],
    references: [projects.id],
  }),
  panels: many(panels),
}));

export const panelsRelations = relations(panels, ({ one }) => ({
  project: one(projects, {
    fields: [panels.projectId],
    references: [projects.id],
  }),
  beat: one(beats, {
    fields: [panels.beatId],
    references: [beats.id],
  }),
}));

export type Project = typeof projects.$inferSelect;
export type Beat = typeof beats.$inferSelect;
export type Panel = typeof panels.$inferSelect;
