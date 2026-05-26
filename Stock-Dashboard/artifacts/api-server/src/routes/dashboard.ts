import { Router, type IRouter } from "express";
import { db, materialsTable, toolsTable, materialRequestsTable, toolRequestsTable, stockMovementsTable, materialRequestItemsTable } from "@workspace/db";
import { sql, eq, and, gte, lt, count } from "drizzle-orm";
import {
  GetDashboardSummaryResponse,
  GetMaterialUsageChartResponse,
  GetToolUsageChartResponse,
  GetRecentActivityResponse,
  GetPendingRequestsSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalMaterials] = await db.select({ count: count() }).from(materialsTable).where(eq(materialsTable.isActive, true));
  const [totalTools] = await db.select({ count: count() }).from(toolsTable);
  const [toolsBorrowed] = await db.select({ count: count() }).from(toolsTable).where(eq(toolsTable.status, "in_use"));
  const [toolsAvailable] = await db.select({ count: count() }).from(toolsTable).where(eq(toolsTable.status, "available"));
  const [toolsMaintenance] = await db.select({ count: count() }).from(toolsTable).where(eq(toolsTable.status, "maintenance"));
  const [pendingMaterialReqs] = await db.select({ count: count() }).from(materialRequestsTable).where(eq(materialRequestsTable.status, "pending"));
  const [pendingToolReqs] = await db.select({ count: count() }).from(toolRequestsTable).where(eq(toolRequestsTable.status, "pending"));

  const allMaterials = await db.select({ currentStock: materialsTable.currentStock, minimumStock: materialsTable.minimumStock }).from(materialsTable).where(eq(materialsTable.isActive, true));
  const lowStockMaterials = allMaterials.filter(m => m.currentStock <= m.minimumStock).length;

  const [stockInToday] = await db.select({ count: count() }).from(stockMovementsTable)
    .where(and(eq(stockMovementsTable.type, "stock_in"), gte(stockMovementsTable.createdAt, today), lt(stockMovementsTable.createdAt, tomorrow)));
  const [stockOutToday] = await db.select({ count: count() }).from(stockMovementsTable)
    .where(and(eq(stockMovementsTable.type, "stock_out"), gte(stockMovementsTable.createdAt, today), lt(stockMovementsTable.createdAt, tomorrow)));

  const summary = {
    totalMaterials: totalMaterials.count,
    totalTools: totalTools.count,
    lowStockMaterials,
    toolsBorrowed: toolsBorrowed.count,
    pendingRequests: pendingMaterialReqs.count + pendingToolReqs.count,
    stockInToday: stockInToday.count,
    stockOutToday: stockOutToday.count,
    toolsAvailable: toolsAvailable.count,
    toolsMaintenance: toolsMaintenance.count,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/material-usage", async (req, res): Promise<void> => {
  const days = 30;
  const result: Array<{ date: string; value: number; label: string }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const [row] = await db.select({ total: sql<number>`coalesce(sum(abs(${stockMovementsTable.quantity})), 0)` })
      .from(stockMovementsTable)
      .where(and(eq(stockMovementsTable.type, "stock_out"), gte(stockMovementsTable.createdAt, d), lt(stockMovementsTable.createdAt, next)));

    result.push({
      date: d.toISOString().slice(0, 10),
      value: Number(row.total) || 0,
      label: d.toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
    });
  }

  res.json(GetMaterialUsageChartResponse.parse(result));
});

router.get("/dashboard/tool-usage", async (req, res): Promise<void> => {
  const days = 30;
  const result: Array<{ date: string; value: number; label: string }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const [row] = await db.select({ total: count() })
      .from(toolRequestsTable)
      .where(and(gte(toolRequestsTable.createdAt, d), lt(toolRequestsTable.createdAt, next)));

    result.push({
      date: d.toISOString().slice(0, 10),
      value: Number(row.total) || 0,
      label: d.toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
    });
  }

  res.json(GetToolUsageChartResponse.parse(result));
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const movements = await db.select().from(stockMovementsTable).orderBy(sql`${stockMovementsTable.createdAt} desc`).limit(10);
  const activities = movements.map(m => {
    const label = m.type === "stock_in" ? "Barang masuk" : m.type === "stock_out" ? "Barang keluar" : "Penyesuaian stok";
    const qty = Math.abs(m.quantity);
    const sign = m.type === "stock_out" ? "-" : "+";
    return {
      id: m.id,
      type: m.type,
      description: `${label}: ${m.materialName} (${sign}${qty} unit)`,
      user: m.performedBy,
      createdAt: m.createdAt.toISOString(),
    };
  });
  res.json(GetRecentActivityResponse.parse(activities));
});

router.get("/dashboard/pending-requests", async (req, res): Promise<void> => {
  const materialRequests = await db.select().from(materialRequestsTable)
    .where(eq(materialRequestsTable.status, "pending"))
    .orderBy(sql`${materialRequestsTable.createdAt} desc`)
    .limit(5);

  const toolRequests = await db.select().from(toolRequestsTable)
    .where(eq(toolRequestsTable.status, "pending"))
    .orderBy(sql`${toolRequestsTable.createdAt} desc`)
    .limit(5);

  const matReqsWithItems = await Promise.all(materialRequests.map(async (mr) => {
    const items = await db.select().from(materialRequestItemsTable).where(eq(materialRequestItemsTable.requestId, mr.id));
    return {
      ...mr,
      requesterId: mr.requesterId ?? null,
      workLocation: mr.workLocation ?? null,
      jobType: mr.jobType ?? null,
      neededDate: mr.neededDate ?? null,
      notes: mr.notes ?? null,
      approvedBy: mr.approvedBy ?? null,
      approvalNotes: mr.approvalNotes ?? null,
      updatedAt: mr.updatedAt.toISOString(),
      createdAt: mr.createdAt.toISOString(),
      items: items.map(i => ({
        id: i.id,
        materialId: i.materialId,
        materialName: i.materialName,
        materialCode: i.materialCode,
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes ?? null,
      })),
    };
  }));

  const toolReqs = toolRequests.map(tr => ({
    ...tr,
    requesterId: tr.requesterId ?? null,
    actualReturn: tr.actualReturn ?? null,
    purpose: tr.purpose ?? null,
    conditionOnReturn: tr.conditionOnReturn ?? null,
    notes: tr.notes ?? null,
    approvedBy: tr.approvedBy ?? null,
    updatedAt: tr.updatedAt.toISOString(),
    createdAt: tr.createdAt.toISOString(),
  }));

  res.json(GetPendingRequestsSummaryResponse.parse({
    materialRequests: matReqsWithItems,
    toolRequests: toolReqs,
  }));
});

export default router;
