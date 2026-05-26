import { Router, type IRouter } from "express";
import { db, suppliersTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";
import {
  ListSuppliersResponse, GetSupplierResponse,
  UpdateSupplierResponse, ListSuppliersQueryParams,
  GetSupplierParams, UpdateSupplierParams, UpdateSupplierBody,
  CreateSupplierBody, DeleteSupplierParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateSupplierCode(): string {
  return `SUP-${Math.floor(10000 + Math.random() * 90000)}`;
}

function formatSupplier(s: Record<string, unknown>) {
  return {
    ...s,
    contactPerson: s.contactPerson ?? null,
    email: s.email ?? null,
    phone: s.phone ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    npwp: s.npwp ?? null,
    paymentTerms: s.paymentTerms ?? null,
    leadTimeDays: s.leadTimeDays ?? null,
    notes: s.notes ?? null,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
    updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
  };
}

router.get("/suppliers", async (req, res): Promise<void> => {
  const q = ListSuppliersQueryParams.safeParse(req.query);
  const search = q.success ? q.data.search : undefined;
  const category = q.success ? q.data.category : undefined;

  const rows = await db.select().from(suppliersTable).where(
    and(
      search ? or(ilike(suppliersTable.name, `%${search}%`), ilike(suppliersTable.code, `%${search}%`)) : undefined,
      category ? eq(suppliersTable.category, category) : undefined,
    )
  ).orderBy(suppliersTable.name);

  res.json(ListSuppliersResponse.parse(rows.map(formatSupplier)));
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const body = CreateSupplierBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error }); return; }

  const code = generateSupplierCode();
  const [row] = await db.insert(suppliersTable).values({
    code,
    name: body.data.name,
    category: body.data.category ?? "Umum",
    contactPerson: body.data.contactPerson ?? null,
    email: body.data.email ?? null,
    phone: body.data.phone ?? null,
    address: body.data.address ?? null,
    city: body.data.city ?? null,
    npwp: body.data.npwp ?? null,
    paymentTerms: body.data.paymentTerms ?? "30 days",
    leadTimeDays: body.data.leadTimeDays ?? null,
    notes: body.data.notes ?? null,
    isActive: true,
  }).returning();

  res.status(201).json(GetSupplierResponse.parse(formatSupplier(row as unknown as Record<string, unknown>)));
});

router.get("/suppliers/:id", async (req, res): Promise<void> => {
  const params = GetSupplierParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Supplier not found" }); return; }

  res.json(GetSupplierResponse.parse(formatSupplier(row as unknown as Record<string, unknown>)));
});

router.patch("/suppliers/:id", async (req, res): Promise<void> => {
  const params = UpdateSupplierParams.safeParse({ id: parseInt(req.params.id) });
  const body = UpdateSupplierBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const updates: Record<string, unknown> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if (body.data.category !== undefined) updates.category = body.data.category;
  if (body.data.contactPerson !== undefined) updates.contactPerson = body.data.contactPerson;
  if (body.data.email !== undefined) updates.email = body.data.email;
  if (body.data.phone !== undefined) updates.phone = body.data.phone;
  if (body.data.address !== undefined) updates.address = body.data.address;
  if (body.data.city !== undefined) updates.city = body.data.city;
  if (body.data.npwp !== undefined) updates.npwp = body.data.npwp;
  if (body.data.paymentTerms !== undefined) updates.paymentTerms = body.data.paymentTerms;
  if (body.data.leadTimeDays !== undefined) updates.leadTimeDays = body.data.leadTimeDays;
  if (body.data.notes !== undefined) updates.notes = body.data.notes;
  if (body.data.isActive !== undefined) updates.isActive = body.data.isActive;

  await db.update(suppliersTable).set(updates).where(eq(suppliersTable.id, params.data.id));
  const [row] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Supplier not found" }); return; }

  res.json(UpdateSupplierResponse.parse(formatSupplier(row as unknown as Record<string, unknown>)));
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const params = DeleteSupplierParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const deleted = await db.delete(suppliersTable).where(eq(suppliersTable.id, params.data.id)).returning();
  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }

  res.status(204).end();
});

export default router;
