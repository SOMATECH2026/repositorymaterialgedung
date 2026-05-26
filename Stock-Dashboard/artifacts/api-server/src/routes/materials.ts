import { Router, type IRouter } from "express";
import { db, materialsTable, stockMovementsTable } from "@workspace/db";
import { eq, ilike, and, or, sql } from "drizzle-orm";
import {
  ListMaterialsResponse,
  GetMaterialResponse,
  UpdateMaterialResponse,
  AdjustMaterialStockResponse,
  ListMaterialCategoriesResponse,
  GetMaterialParams,
  UpdateMaterialParams,
  UpdateMaterialBody,
  DeleteMaterialParams,
  AdjustMaterialStockParams,
  AdjustMaterialStockBody,
  CreateMaterialBody,
  ListMaterialsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateMaterialCode(): string {
  const prefix = "MAT";
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${num}`;
}

function formatMaterial(m: Record<string, unknown>) {
  return {
    ...m,
    subCategory: m.subCategory ?? null,
    brand: m.brand ?? null,
    specification: m.specification ?? null,
    rackLocation: m.rackLocation ?? null,
    warehouseZone: m.warehouseZone ?? null,
    supplier: m.supplier ?? null,
    unitPrice: m.unitPrice != null ? Number(m.unitPrice) : null,
    isLowStock: Number(m.currentStock) <= Number(m.minimumStock),
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : String(m.updatedAt),
  };
}

router.get("/materials/categories", async (req, res): Promise<void> => {
  const rows = await db.selectDistinct({ category: materialsTable.category }).from(materialsTable).where(eq(materialsTable.isActive, true));
  const cats = rows.map(r => r.category).filter(Boolean);
  res.json(ListMaterialCategoriesResponse.parse(cats));
});

router.get("/materials", async (req, res): Promise<void> => {
  const qp = ListMaterialsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const { category, search, lowStock } = qp.data;

  const conditions = [eq(materialsTable.isActive, true)];
  if (category) conditions.push(eq(materialsTable.category, category));
  if (search) {
    conditions.push(
      or(
        ilike(materialsTable.name, `%${search}%`),
        ilike(materialsTable.code, `%${search}%`),
        ilike(materialsTable.supplier ?? materialsTable.name, `%${search}%`)
      )!
    );
  }

  let rows = await db.select().from(materialsTable).where(and(...conditions)).orderBy(materialsTable.name);

  if (lowStock === true) {
    rows = rows.filter(r => Number(r.currentStock) <= Number(r.minimumStock));
  }

  const formatted = rows.map(formatMaterial);
  res.json(ListMaterialsResponse.parse(formatted));
});

router.post("/materials", async (req, res): Promise<void> => {
  const parsed = CreateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let code = generateMaterialCode();
  // Ensure unique code
  const existing = await db.select({ code: materialsTable.code }).from(materialsTable).where(eq(materialsTable.code, code));
  if (existing.length > 0) code = generateMaterialCode() + "-" + Date.now();

  const { unitPrice, ...rest } = parsed.data;
  const [material] = await db.insert(materialsTable).values({
    ...rest,
    code,
    currentStock: rest.currentStock ?? 0,
    unitPrice: unitPrice?.toString(),
  }).returning();

  res.status(201).json(GetMaterialResponse.parse(formatMaterial(material as unknown as Record<string, unknown>)));
});

router.get("/materials/:id", async (req, res): Promise<void> => {
  const params = GetMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [material] = await db.select().from(materialsTable).where(eq(materialsTable.id, params.data.id));
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }

  res.json(GetMaterialResponse.parse(formatMaterial(material as unknown as Record<string, unknown>)));
});

router.patch("/materials/:id", async (req, res): Promise<void> => {
  const params = UpdateMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateMaterialBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { unitPrice, ...rest } = body.data;
  const updates: Record<string, unknown> = { ...rest };
  if (unitPrice !== undefined) updates.unitPrice = unitPrice?.toString();

  const [material] = await db.update(materialsTable).set(updates).where(eq(materialsTable.id, params.data.id)).returning();
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }

  res.json(UpdateMaterialResponse.parse(formatMaterial(material as unknown as Record<string, unknown>)));
});

router.delete("/materials/:id", async (req, res): Promise<void> => {
  const params = DeleteMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [material] = await db.update(materialsTable).set({ isActive: false }).where(eq(materialsTable.id, params.data.id)).returning();
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/materials/:id/stock-adjust", async (req, res): Promise<void> => {
  const params = AdjustMaterialStockParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AdjustMaterialStockBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [material] = await db.select().from(materialsTable).where(eq(materialsTable.id, params.data.id));
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }

  const previousStock = material.currentStock;
  let newStock = previousStock;

  if (body.data.type === "stock_in") newStock = previousStock + body.data.quantity;
  else if (body.data.type === "stock_out") newStock = Math.max(0, previousStock - body.data.quantity);
  else newStock = body.data.quantity; // adjustment = set absolute

  const [updated] = await db.update(materialsTable).set({ currentStock: newStock }).where(eq(materialsTable.id, params.data.id)).returning();

  await db.insert(stockMovementsTable).values({
    materialId: material.id,
    materialName: material.name,
    materialCode: material.code,
    type: body.data.type,
    quantity: body.data.type === "stock_out" ? -body.data.quantity : body.data.quantity,
    previousStock,
    newStock,
    reason: body.data.reason,
    reference: body.data.reference ?? null,
    performedBy: "Warehouse Admin",
  });

  res.json(AdjustMaterialStockResponse.parse(formatMaterial(updated as unknown as Record<string, unknown>)));
});

export default router;
