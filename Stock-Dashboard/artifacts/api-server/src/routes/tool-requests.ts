import { Router, type IRouter } from "express";
import { db, toolRequestsTable, toolsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListToolRequestsResponse,
  GetToolRequestResponse,
  ApproveToolRequestResponse,
  ReturnToolRequestResponse,
  CreateToolRequestBody,
  GetToolRequestParams,
  ApproveToolRequestParams,
  ApproveToolRequestBody,
  ReturnToolRequestParams,
  ReturnToolRequestBody,
  ListToolRequestsQueryParams,
  DeleteToolRequestParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateToolRequestNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `REQ-TL-${y}${m}${d}-${rand}`;
}

function formatToolRequest(tr: Record<string, unknown>) {
  return {
    ...tr,
    requesterId: tr.requesterId ?? null,
    actualReturn: tr.actualReturn ?? null,
    purpose: tr.purpose ?? null,
    conditionOnReturn: tr.conditionOnReturn ?? null,
    notes: tr.notes ?? null,
    approvedBy: tr.approvedBy ?? null,
    createdAt: tr.createdAt instanceof Date ? tr.createdAt.toISOString() : String(tr.createdAt),
    updatedAt: tr.updatedAt instanceof Date ? tr.updatedAt.toISOString() : String(tr.updatedAt),
  };
}

router.get("/tool-requests", async (req, res): Promise<void> => {
  const qp = ListToolRequestsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }
  const { status } = qp.data;

  const rows = status
    ? await db.select().from(toolRequestsTable).where(eq(toolRequestsTable.status, status)).orderBy(toolRequestsTable.createdAt)
    : await db.select().from(toolRequestsTable).orderBy(toolRequestsTable.createdAt);

  res.json(ListToolRequestsResponse.parse(rows.map(r => formatToolRequest(r as unknown as Record<string, unknown>))));
});

router.post("/tool-requests", async (req, res): Promise<void> => {
  const parsed = CreateToolRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.id, parsed.data.toolId));
  if (!tool) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }

  const requestNumber = generateToolRequestNumber();
  const [newRequest] = await db.insert(toolRequestsTable).values({
    ...parsed.data,
    requestNumber,
    toolName: tool.name,
    toolCode: tool.code,
    status: "pending",
  }).returning();

  res.status(201).json(GetToolRequestResponse.parse(formatToolRequest(newRequest as unknown as Record<string, unknown>)));
});

router.get("/tool-requests/:id", async (req, res): Promise<void> => {
  const params = GetToolRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [tr] = await db.select().from(toolRequestsTable).where(eq(toolRequestsTable.id, params.data.id));
  if (!tr) {
    res.status(404).json({ error: "Tool request not found" });
    return;
  }

  res.json(GetToolRequestResponse.parse(formatToolRequest(tr as unknown as Record<string, unknown>)));
});

router.post("/tool-requests/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveToolRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ApproveToolRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [tr] = await db.select().from(toolRequestsTable).where(eq(toolRequestsTable.id, params.data.id));
  if (!tr) {
    res.status(404).json({ error: "Tool request not found" });
    return;
  }

  await db.update(toolRequestsTable).set({
    status: "approved",
    approvedBy: body.data.approvedBy,
    notes: body.data.notes ?? null,
  }).where(eq(toolRequestsTable.id, params.data.id));

  // Update tool status to in_use
  await db.update(toolsTable).set({ status: "in_use", lastUsedBy: tr.requesterName }).where(eq(toolsTable.id, tr.toolId));

  const [updated] = await db.select().from(toolRequestsTable).where(eq(toolRequestsTable.id, params.data.id));
  res.json(ApproveToolRequestResponse.parse(formatToolRequest(updated as unknown as Record<string, unknown>)));
});

router.post("/tool-requests/:id/return", async (req, res): Promise<void> => {
  const params = ReturnToolRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ReturnToolRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [tr] = await db.select().from(toolRequestsTable).where(eq(toolRequestsTable.id, params.data.id));
  if (!tr) {
    res.status(404).json({ error: "Tool request not found" });
    return;
  }

  await db.update(toolRequestsTable).set({
    status: "returned",
    actualReturn: new Date().toISOString(),
    conditionOnReturn: body.data.conditionOnReturn,
    notes: body.data.notes ?? null,
  }).where(eq(toolRequestsTable.id, params.data.id));

  // Return tool to available
  await db.update(toolsTable).set({
    status: "available",
    condition: body.data.conditionOnReturn,
  }).where(eq(toolsTable.id, tr.toolId));

  const [updated] = await db.select().from(toolRequestsTable).where(eq(toolRequestsTable.id, params.data.id));
  res.json(ReturnToolRequestResponse.parse(formatToolRequest(updated as unknown as Record<string, unknown>)));
});

router.delete("/tool-requests/:id", async (req, res): Promise<void> => {
  const params = DeleteToolRequestParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const deleted = await db.delete(toolRequestsTable).where(eq(toolRequestsTable.id, params.data.id)).returning();
  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }

  res.status(204).end();
});

export default router;
