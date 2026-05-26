import { Router, type IRouter } from "express";
import { db, materialRequestsTable, materialRequestItemsTable, materialsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListMaterialRequestsResponse,
  GetMaterialRequestResponse,
  ApproveMaterialRequestResponse,
  RejectMaterialRequestResponse,
  CreateMaterialRequestBody,
  GetMaterialRequestParams,
  ApproveMaterialRequestParams,
  ApproveMaterialRequestBody,
  RejectMaterialRequestParams,
  RejectMaterialRequestBody,
  ListMaterialRequestsQueryParams,
  DeleteMaterialRequestParams,
  ReleaseMaterialRequestParams,
  ReleaseMaterialRequestBody,
  ReleaseMaterialRequestResponse,
} from "@workspace/api-zod";
import { stockMovementsTable } from "@workspace/db";

const router: IRouter = Router();

function generateRequestNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `REQ-MAT-${y}${m}${d}-${rand}`;
}

async function getRequestWithItems(id: number) {
  const [req] = await db.select().from(materialRequestsTable).where(eq(materialRequestsTable.id, id));
  if (!req) return null;
  const items = await db.select().from(materialRequestItemsTable).where(eq(materialRequestItemsTable.requestId, id));
  return {
    ...req,
    requesterId: req.requesterId ?? null,
    workLocation: req.workLocation ?? null,
    jobType: req.jobType ?? null,
    neededDate: req.neededDate ?? null,
    notes: req.notes ?? null,
    approvedBy: req.approvedBy ?? null,
    approvalNotes: req.approvalNotes ?? null,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
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
}

router.get("/material-requests", async (req, res): Promise<void> => {
  const qp = ListMaterialRequestsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const { status, priority } = qp.data;

  const conditions = [];
  if (status) conditions.push(eq(materialRequestsTable.status, status));
  if (priority) conditions.push(eq(materialRequestsTable.priority, priority));

  const rows = conditions.length > 0
    ? await db.select().from(materialRequestsTable).where(and(...conditions)).orderBy(materialRequestsTable.createdAt)
    : await db.select().from(materialRequestsTable).orderBy(materialRequestsTable.createdAt);

  const withItems = await Promise.all(rows.map(async r => {
    const items = await db.select().from(materialRequestItemsTable).where(eq(materialRequestItemsTable.requestId, r.id));
    return {
      ...r,
      requesterId: r.requesterId ?? null,
      workLocation: r.workLocation ?? null,
      jobType: r.jobType ?? null,
      neededDate: r.neededDate ?? null,
      notes: r.notes ?? null,
      approvedBy: r.approvedBy ?? null,
      approvalNotes: r.approvalNotes ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
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

  res.json(ListMaterialRequestsResponse.parse(withItems));
});

router.post("/material-requests", async (req, res): Promise<void> => {
  const parsed = CreateMaterialRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, ...requestData } = parsed.data;
  const requestNumber = generateRequestNumber();

  const [newRequest] = await db.insert(materialRequestsTable).values({
    ...requestData,
    requestNumber,
    status: "pending",
  }).returning();

  // Insert items with material info
  for (const item of items) {
    const [material] = await db.select().from(materialsTable).where(eq(materialsTable.id, item.materialId));
    if (!material) continue;
    await db.insert(materialRequestItemsTable).values({
      requestId: newRequest.id,
      materialId: item.materialId,
      materialName: material.name,
      materialCode: material.code,
      quantity: item.quantity,
      unit: material.unit,
      notes: item.notes ?? null,
    });
  }

  const result = await getRequestWithItems(newRequest.id);
  res.status(201).json(GetMaterialRequestResponse.parse(result));
});

router.get("/material-requests/:id", async (req, res): Promise<void> => {
  const params = GetMaterialRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getRequestWithItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(GetMaterialRequestResponse.parse(result));
});

router.post("/material-requests/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveMaterialRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ApproveMaterialRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  await db.update(materialRequestsTable).set({
    status: "approved",
    approvedBy: body.data.approvedBy,
    approvalNotes: body.data.notes ?? null,
  }).where(eq(materialRequestsTable.id, params.data.id));

  const result = await getRequestWithItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(ApproveMaterialRequestResponse.parse(result));
});

router.post("/material-requests/:id/reject", async (req, res): Promise<void> => {
  const params = RejectMaterialRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = RejectMaterialRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  await db.update(materialRequestsTable).set({
    status: "rejected",
    approvedBy: body.data.approvedBy,
    approvalNotes: body.data.notes ?? null,
  }).where(eq(materialRequestsTable.id, params.data.id));

  const result = await getRequestWithItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(RejectMaterialRequestResponse.parse(result));
});

router.post("/material-requests/:id/release", async (req, res): Promise<void> => {
  const params = ReleaseMaterialRequestParams.safeParse({ id: parseInt(req.params.id) });
  const body = ReleaseMaterialRequestBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const request = await getRequestWithItems(params.data.id);
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }
  if (request.status !== "approved") { res.status(400).json({ error: "Only approved requests can be released" }); return; }

  for (const item of request.items) {
    if (!item.materialId) continue;
    const [mat] = await db.select().from(materialsTable).where(eq(materialsTable.id, item.materialId));
    if (!mat) continue;
    const prevStock = mat.currentStock;
    const newStock = Math.max(0, prevStock - item.quantity);
    await db.update(materialsTable).set({ currentStock: newStock }).where(eq(materialsTable.id, item.materialId));
    await db.insert(stockMovementsTable).values({
      materialId: item.materialId,
      materialName: mat.name,
      materialCode: mat.code,
      type: "stock_out",
      quantity: -item.quantity,
      previousStock: prevStock,
      newStock,
      reason: `Release permintaan: ${request.requestNumber}`,
      reference: request.requestNumber,
      performedBy: body.data.releasedBy,
    });
  }

  await db.update(materialRequestsTable).set({ status: "released" }).where(eq(materialRequestsTable.id, params.data.id));

  const updated = await getRequestWithItems(params.data.id);
  res.json(ReleaseMaterialRequestResponse.parse(updated));
});

router.delete("/material-requests/:id", async (req, res): Promise<void> => {
  const params = DeleteMaterialRequestParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(materialRequestItemsTable).where(eq(materialRequestItemsTable.requestId, params.data.id));
  const deleted = await db.delete(materialRequestsTable).where(eq(materialRequestsTable.id, params.data.id)).returning();
  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }

  res.status(204).end();
});

export default router;
