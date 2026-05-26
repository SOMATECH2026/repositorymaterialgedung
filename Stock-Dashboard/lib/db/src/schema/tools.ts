import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toolsTable = pgTable("tools", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  serialNumber: text("serial_number"),
  brand: text("brand"),
  model: text("model"),
  purchaseYear: integer("purchase_year"),
  condition: text("condition").notNull().default("good"),
  status: text("status").notNull().default("available"),
  location: text("location"),
  pic: text("pic"),
  assetValue: numeric("asset_value", { precision: 15, scale: 2 }),
  nextMaintenanceDate: text("next_maintenance_date"),
  nextCalibrationDate: text("next_calibration_date"),
  lastUsedBy: text("last_used_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertToolSchema = createInsertSchema(toolsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof toolsTable.$inferSelect;
