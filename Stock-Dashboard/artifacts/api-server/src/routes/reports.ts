import { Router, type IRouter } from "express";
import { db, materialsTable, stockMovementsTable } from "@workspace/db";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import {
  GetInventoryValueResponse,
  GetTopMaterialsResponse,
  GetStockCardResponse,
  GetTopMaterialsQueryParams,
  GetStockCardQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports/inventory-value", async (req, res): Promise<void> => {
  const materials = await db.select().from(materialsTable).where(eq(materialsTable.isActive, true));

  const items = materials.map(m => ({
    materialId: m.id,
    materialName: m.name,
    materialCode: m.code ?? "",
    category: m.category,
    currentStock: m.currentStock,
    unitPrice: m.unitPrice != null ? Number(m.unitPrice) : 0,
    totalValue: m.currentStock * (m.unitPrice != null ? Number(m.unitPrice) : 0),
  })).sort((a, b) => b.totalValue - a.totalValue);

  const totalValue = items.reduce((sum, i) => sum + i.totalValue, 0);

  res.json(GetInventoryValueResponse.parse({
    totalValue,
    totalItems: items.length,
    items,
  }));
});

router.get("/reports/top-materials", async (req, res): Promise<void> => {
  const q = GetTopMaterialsQueryParams.safeParse(req.query);
  const limit = (q.success ? q.data.limit : undefined) ?? 10;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db.select({
    materialId: stockMovementsTable.materialId,
    materialName: stockMovementsTable.materialName,
    materialCode: sql<string>`coalesce(${stockMovementsTable.materialCode}, '')`,
    totalQty: sql<number>`sum(abs(${stockMovementsTable.quantity}))`,
    transactionCount: sql<number>`count(*)`,
  })
    .from(stockMovementsTable)
    .where(and(
      eq(stockMovementsTable.type, "stock_out"),
      gte(stockMovementsTable.createdAt, thirtyDaysAgo),
    ))
    .groupBy(stockMovementsTable.materialId, stockMovementsTable.materialName, stockMovementsTable.materialCode)
    .orderBy(sql`sum(abs(${stockMovementsTable.quantity})) desc`)
    .limit(limit);

  // Enrich with category from materials
  const enriched = await Promise.all(rows.map(async r => {
    const [mat] = await db.select({ category: materialsTable.category }).from(materialsTable).where(eq(materialsTable.id, r.materialId));
    return {
      materialId: r.materialId,
      materialName: r.materialName,
      materialCode: r.materialCode || "",
      category: mat?.category ?? "-",
      totalQty: Number(r.totalQty) || 0,
      transactionCount: Number(r.transactionCount) || 0,
    };
  }));

  res.json(GetTopMaterialsResponse.parse(enriched));
});

router.get("/reports/stock-card", async (req, res): Promise<void> => {
  const q = GetStockCardQueryParams.safeParse(req.query);
  if (!q.success || !q.data.materialId) { res.status(400).json({ error: "materialId required" }); return; }

  const { materialId, startDate, endDate } = q.data;
  const [mat] = await db.select().from(materialsTable).where(eq(materialsTable.id, materialId));
  if (!mat) { res.status(404).json({ error: "Material not found" }); return; }

  const conditions = [eq(stockMovementsTable.materialId, materialId)];
  if (startDate) conditions.push(gte(stockMovementsTable.createdAt, new Date(startDate)));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lt(stockMovementsTable.createdAt, end));
  }

  const movements = await db.select().from(stockMovementsTable)
    .where(and(...conditions))
    .orderBy(stockMovementsTable.createdAt);

  const transactions = movements.map(m => ({
    id: m.id,
    date: m.createdAt.toISOString(),
    type: m.type,
    qty: m.quantity,
    balance: m.newStock,
    reason: m.reason,
    reference: m.reference ?? null,
    performedBy: m.performedBy,
  }));

  res.json(GetStockCardResponse.parse({
    materialId: mat.id,
    materialName: mat.name,
    materialCode: mat.code,
    currentStock: mat.currentStock,
    transactions,
  }));
});

export default router;
