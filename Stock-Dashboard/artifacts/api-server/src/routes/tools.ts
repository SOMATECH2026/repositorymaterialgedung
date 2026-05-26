import { Router, type IRouter } from "express";
import { db, toolsTable } from "@workspace/db";
import { eq, ilike, and, or, count } from "drizzle-orm";
import {
  ListToolsResponse,
  GetToolResponse,
  UpdateToolResponse,
  UpdateToolStatusResponse,
  GetToolStatsResponse,
  GetToolParams,
  UpdateToolParams,
  UpdateToolBody,
  DeleteToolParams,
  UpdateToolStatusParams,
  UpdateToolStatusBody,
  CreateToolBody,
  ListToolsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateToolCode(): string {
  const prefix = "TL";
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${num}`;
}

function formatTool(t: Record<string, unknown>) {
  return {
    ...t,
    serialNumber: t.serialNumber ?? null,
    brand: t.brand ?? null,
    model: t.model ?? null,
    purchaseYear: t.purchaseYear ?? null,
    location: t.location ?? null,
    pic: t.pic ?? null,
    assetValue: t.assetValue != null ? Number(t.assetValue) : null,
    nextMaintenanceDate: t.nextMaintenanceDate ?? null,
    nextCalibrationDate: t.nextCalibrationDate ?? null,
    lastUsedBy: t.lastUsedBy ?? null,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
  };
}

router.get("/tools/stats", async (req, res): Promise<void> => {
  const statuses = ["available", "in_use", "maintenance", "calibration", "damaged", "lost"];
  const stats: Record<string, number> = {};
  for (const s of statuses) {
    const [row] = await db.select({ count: count() }).from(toolsTable).where(eq(toolsTable.status, s));
    stats[s] = row.count;
  }
  res.json(GetToolStatsResponse.parse({
    available: stats.available,
    inUse: stats.in_use,
    maintenance: stats.maintenance,
    calibration: stats.calibration,
    damaged: stats.damaged,
    lost: stats.lost,
  }));
});

router.get("/tools", async (req, res): Promise<void> => {
  const qp = ListToolsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const { status, category, search } = qp.data;

  const conditions = [];
  if (status) conditions.push(eq(toolsTable.status, status));
  if (category) conditions.push(eq(toolsTable.category, category));
  if (search) {
    conditions.push(
      or(
        ilike(toolsTable.name, `%${search}%`),
        ilike(toolsTable.code, `%${search}%`)
      )!
    );
  }

  const rows = conditions.length > 0
    ? await db.select().from(toolsTable).where(and(...conditions)).orderBy(toolsTable.name)
    : await db.select().from(toolsTable).orderBy(toolsTable.name);

  res.json(ListToolsResponse.parse(rows.map(t => formatTool(t as unknown as Record<string, unknown>))));
});

router.post("/tools", async (req, res): Promise<void> => {
  const parsed = CreateToolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let code = generateToolCode();
  const { assetValue, ...rest } = parsed.data;

  const [tool] = await db.insert(toolsTable).values({
    ...rest,
    code,
    status: "available",
    assetValue: assetValue?.toString(),
  }).returning();

  res.status(201).json(GetToolResponse.parse(formatTool(tool as unknown as Record<string, unknown>)));
});

router.get("/tools/:id", async (req, res): Promise<void> => {
  const params = GetToolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, params.data.id));
  if (!tool) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }

  res.json(GetToolResponse.parse(formatTool(tool as unknown as Record<string, unknown>)));
});

router.patch("/tools/:id", async (req, res): Promise<void> => {
  const params = UpdateToolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateToolBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { assetValue, ...rest } = body.data;
  const updates: Record<string, unknown> = { ...rest };
  if (assetValue !== undefined) updates.assetValue = assetValue?.toString();

  const [tool] = await db.update(toolsTable).set(updates).where(eq(toolsTable.id, params.data.id)).returning();
  if (!tool) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }

  res.json(UpdateToolResponse.parse(formatTool(tool as unknown as Record<string, unknown>)));
});

router.delete("/tools/:id", async (req, res): Promise<void> => {
  const params = DeleteToolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [tool] = await db.delete(toolsTable).where(eq(toolsTable.id, params.data.id)).returning();
  if (!tool) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/tools/:id/status", async (req, res): Promise<void> => {
  const params = UpdateToolStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateToolStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [tool] = await db.update(toolsTable).set({ status: body.data.status }).where(eq(toolsTable.id, params.data.id)).returning();
  if (!tool) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }

  res.json(UpdateToolStatusResponse.parse(formatTool(tool as unknown as Record<string, unknown>)));
});

export default router;
