import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { toolsTable } from "./tools";

export const toolRequestsTable = pgTable("tool_requests", {
  id: serial("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  requesterName: text("requester_name").notNull(),
  requesterId: integer("requester_id").references(() => usersTable.id),
  department: text("department").notNull(),
  toolId: integer("tool_id").notNull().references(() => toolsTable.id),
  toolName: text("tool_name").notNull(),
  toolCode: text("tool_code").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledStart: text("scheduled_start").notNull(),
  scheduledEnd: text("scheduled_end").notNull(),
  actualReturn: text("actual_return"),
  purpose: text("purpose"),
  conditionOnReturn: text("condition_on_return"),
  notes: text("notes"),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertToolRequestSchema = createInsertSchema(toolRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertToolRequest = z.infer<typeof insertToolRequestSchema>;
export type ToolRequest = typeof toolRequestsTable.$inferSelect;
