import { Router, type IRouter } from "express";
import { db, purchaseOrdersTable, purchaseOrderItemsTable, materialsTable, stockMovementsTable } from "@workspace/db";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import {
  ListPurchaseOrdersResponse, GetPurchaseOrderResponse,
  ApprovePurchaseOrderResponse, ReceivePurchaseOrderResponse,
  ListPurchaseOrdersQueryParams, GetPurchaseOrderParams, DeletePurchaseOrderParams,
  ApprovePurchaseOrderParams, ApprovePurchaseOrderBody,
  ReceivePurchaseOrderParams, ReceivePurchaseOrderBody,
  CreatePurchaseOrderBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generatePONumber(): string {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `PO/${ym}/${Math.floor(1000 + Math.random() * 9000)}`;
}

async function getPOWithItems(id: number) {
  const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
  if (!po) return null;
  const items = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.poId, id));
  return {
    ...po,
    supplierId: po.supplierId ?? null,
    supplierCode: po.supplierCode ?? null,
    approvedBy: po.approvedBy ?? null,
    expectedDelivery: po.expectedDelivery ? po.expectedDelivery.toISOString() : null,
    actualDelivery: po.actualDelivery ? po.actualDelivery.toISOString() : null,
    totalAmount: po.totalAmount != null ? Number(po.totalAmount) : 0,
    notes: po.notes ?? null,
    terms: po.terms ?? null,
    createdAt: po.createdAt.toISOString(),
    updatedAt: po.updatedAt.toISOString(),
    items: items.map(i => ({
      ...i,
      materialId: i.materialId ?? null,
      materialCode: i.materialCode ?? null,
      unitPrice: i.unitPrice != null ? Number(i.unitPrice) : 0,
      totalPrice: i.totalPrice != null ? Number(i.totalPrice) : 0,
      notes: i.notes ?? null,
    })),
  };
}

router.get("/purchase-orders", async (req, res): Promise<void> => {
  const q = ListPurchaseOrdersQueryParams.safeParse(req.query);
  const status = q.success ? q.data.status : undefined;
  const search = q.success ? q.data.search : undefined;

  const rows = await db.select().from(purchaseOrdersTable).where(
    and(
      status ? eq(purchaseOrdersTable.status, status) : undefined,
      search ? or(ilike(purchaseOrdersTable.poNumber, `%${search}%`), ilike(purchaseOrdersTable.supplierName, `%${search}%`)) : undefined,
    )
  ).orderBy(sql`${purchaseOrdersTable.createdAt} desc`);

  const withItems = await Promise.all(rows.map(po => getPOWithItems(po.id)));
  res.json(ListPurchaseOrdersResponse.parse(withItems.filter(Boolean)));
});

router.post("/purchase-orders", async (req, res): Promise<void> => {
  const body = CreatePurchaseOrderBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error }); return; }

  const poNumber = generatePONumber();
  const totalAmount = (body.data.items ?? []).reduce((sum, i) => sum + (i.quantityOrdered * (i.unitPrice ?? 0)), 0);

  const [po] = await db.insert(purchaseOrdersTable).values({
    poNumber,
    supplierId: body.data.supplierId ?? null,
    supplierName: body.data.supplierName,
    supplierCode: body.data.supplierCode ?? null,
    status: "draft",
    priority: (body.data.priority as string) ?? "medium",
    requestedBy: body.data.requestedBy,
    expectedDelivery: body.data.expectedDelivery ? new Date(body.data.expectedDelivery) : null,
    notes: body.data.notes ?? null,
    terms: body.data.terms ?? null,
    totalAmount: String(totalAmount),
  }).returning();

  for (const item of (body.data.items ?? [])) {
    const unitPrice = item.unitPrice ?? 0;
    await db.insert(purchaseOrderItemsTable).values({
      poId: po.id,
      materialId: item.materialId ?? null,
      materialName: item.materialName,
      materialCode: item.materialCode ?? null,
      unit: item.unit,
      quantityOrdered: item.quantityOrdered,
      quantityReceived: 0,
      unitPrice: String(unitPrice),
      totalPrice: String(item.quantityOrdered * unitPrice),
      notes: item.notes ?? null,
    });
  }

  const result = await getPOWithItems(po.id);
  res.status(201).json(GetPurchaseOrderResponse.parse(result));
});

router.get("/purchase-orders/:id", async (req, res): Promise<void> => {
  const params = GetPurchaseOrderParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const result = await getPOWithItems(params.data.id);
  if (!result) { res.status(404).json({ error: "PO not found" }); return; }

  res.json(GetPurchaseOrderResponse.parse(result));
});

router.delete("/purchase-orders/:id", async (req, res): Promise<void> => {
  const params = DeletePurchaseOrderParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.poId, params.data.id));
  const deleted = await db.delete(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, params.data.id)).returning();
  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }

  res.status(204).end();
});

router.post("/purchase-orders/:id/approve", async (req, res): Promise<void> => {
  const params = ApprovePurchaseOrderParams.safeParse({ id: parseInt(req.params.id) });
  const body = ApprovePurchaseOrderBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }

  await db.update(purchaseOrdersTable).set({
    status: "approved",
    approvedBy: body.data.approvedBy,
  }).where(eq(purchaseOrdersTable.id, params.data.id));

  const result = await getPOWithItems(params.data.id);
  if (!result) { res.status(404).json({ error: "PO not found" }); return; }

  res.json(ApprovePurchaseOrderResponse.parse(result));
});

router.post("/purchase-orders/:id/receive", async (req, res): Promise<void> => {
  const params = ReceivePurchaseOrderParams.safeParse({ id: parseInt(req.params.id) });
  const body = ReceivePurchaseOrderBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const po = await getPOWithItems(params.data.id);
  if (!po) { res.status(404).json({ error: "PO not found" }); return; }

  for (const recv of (body.data.items ?? [])) {
    if (!recv.quantityReceived || recv.quantityReceived <= 0) continue;

    const item = po.items.find(i => i.id === recv.itemId);
    if (!item) continue;

    // Update received qty on the item
    await db.update(purchaseOrderItemsTable).set({
      quantityReceived: sql`${purchaseOrderItemsTable.quantityReceived} + ${recv.quantityReceived}`,
    }).where(eq(purchaseOrderItemsTable.id, recv.itemId));

    // If material linked, do stock_in
    if (item.materialId) {
      const [mat] = await db.select().from(materialsTable).where(eq(materialsTable.id, item.materialId));
      if (mat) {
        const prevStock = mat.currentStock;
        const newStock = prevStock + recv.quantityReceived;
        await db.update(materialsTable).set({ currentStock: newStock }).where(eq(materialsTable.id, item.materialId));
        await db.insert(stockMovementsTable).values({
          materialId: item.materialId,
          materialName: mat.name,
          materialCode: mat.code,
          type: "stock_in",
          quantity: recv.quantityReceived,
          previousStock: prevStock,
          newStock,
          reason: `Penerimaan PO: ${po.poNumber}`,
          reference: po.poNumber,
          performedBy: body.data.receivedBy,
        });
      }
    }
  }

  // Check if all items received — update PO status
  const updatedItems = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.poId, params.data.id));
  const allReceived = updatedItems.every(i => i.quantityReceived >= i.quantityOrdered);
  const anyReceived = updatedItems.some(i => i.quantityReceived > 0);
  const newStatus = allReceived ? "received" : anyReceived ? "partial_received" : po.status;

  await db.update(purchaseOrdersTable).set({
    status: newStatus,
    actualDelivery: allReceived ? new Date() : undefined,
  }).where(eq(purchaseOrdersTable.id, params.data.id));

  const result = await getPOWithItems(params.data.id);
  res.json(ReceivePurchaseOrderResponse.parse(result));
});

export default router;
