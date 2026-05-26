import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: integer("supplier_id"),
  supplierName: text("supplier_name").notNull(),
  supplierCode: text("supplier_code"),
  status: text("status").notNull().default("draft"),
  // draft | pending_approval | approved | sent | partial_received | received | cancelled
  priority: text("priority").notNull().default("medium"),
  requestedBy: text("requested_by").notNull(),
  approvedBy: text("approved_by"),
  expectedDelivery: timestamp("expected_delivery", { withTimezone: true }),
  actualDelivery: timestamp("actual_delivery", { withTimezone: true }),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).default("0"),
  notes: text("notes"),
  terms: text("terms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull(),
  materialId: integer("material_id"),
  materialName: text("material_name").notNull(),
  materialCode: text("material_code"),
  unit: text("unit").notNull(),
  quantityOrdered: integer("quantity_ordered").notNull(),
  quantityReceived: integer("quantity_received").notNull().default(0),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).default("0"),
  totalPrice: numeric("total_price", { precision: 18, scale: 2 }).default("0"),
  notes: text("notes"),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItemsTable).omit({ id: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;
