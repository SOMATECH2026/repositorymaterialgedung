import { Router, type IRouter } from "express";
import { db, stockMovementsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  ListStockMovementsResponse,
  ListStockMovementsQueryParams,
  DeleteStockMovementParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stock-movements", async (req, res): Promise<void> => {
  const qp = ListStockMovementsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const { type, materialId, limit } = qp.data;

  const conditions = [];
  if (type) conditions.push(eq(stockMovementsTable.type, type));
  if (materialId) conditions.push(eq(stockMovementsTable.materialId, materialId));

  let query = db.select().from(stockMovementsTable).orderBy(desc(stockMovementsTable.createdAt));

  let rows = conditions.length > 0
    ? await db.select().from(stockMovementsTable).where(and(...conditions)).orderBy(desc(stockMovementsTable.createdAt)).limit(limit ?? 100)
    : await db.select().from(stockMovementsTable).orderBy(desc(stockMovementsTable.createdAt)).limit(limit ?? 100);

  const formatted = rows.map(m => ({
    ...m,
    reference: m.reference ?? null,
    createdAt: m.createdAt.toISOString(),
  }));

  res.json(ListStockMovementsResponse.parse(formatted));
});

router.delete("/stock-movements/:id", async (req, res): Promise<void> => {
  const params = DeleteStockMovementParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const deleted = await db.delete(stockMovementsTable).where(eq(stockMovementsTable.id, params.data.id)).returning();
  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }

  res.status(204).end();
});

export default router;
