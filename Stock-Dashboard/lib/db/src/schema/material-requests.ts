import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { materialsTable } from "./materials";

export const materialRequestsTable = pgTable("material_requests", {
  id: serial("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  requesterName: text("requester_name").notNull(),
  requesterId: integer("requester_id").references(() => usersTable.id),
  department: text("department").notNull(),
  workLocation: text("work_location"),
  jobType: text("job_type"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  neededDate: text("needed_date"),
  notes: text("notes"),
  approvedBy: text("approved_by"),
  approvalNotes: text("approval_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const materialRequestItemsTable = pgTable("material_request_items", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => materialRequestsTable.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => materialsTable.id),
  materialName: text("material_name").notNull(),
  materialCode: text("material_code").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull(),
  notes: text("notes"),
});

export const insertMaterialRequestSchema = createInsertSchema(materialRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMaterialRequest = z.infer<typeof insertMaterialRequestSchema>;
export type MaterialRequest = typeof materialRequestsTable.$inferSelect;
export type MaterialRequestItem = typeof materialRequestItemsTable.$inferSelect;
