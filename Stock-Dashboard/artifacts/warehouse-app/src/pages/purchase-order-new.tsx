import { useState } from "react";
import { useLocation } from "wouter";
import {
  useCreatePurchaseOrder, useListSuppliers, useListMaterials,
  getListPurchaseOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface POItemForm {
  materialId?: number;
  materialName: string;
  materialCode: string;
  unit: string;
  quantityOrdered: number;
  unitPrice: number;
  notes: string;
}

export function PurchaseOrderNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [supplierMode, setSupplierMode] = useState<"existing" | "manual">("existing");
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [priority, setPriority] = useState("medium");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<POItemForm[]>([
    { materialName: "", materialCode: "", unit: "", quantityOrdered: 1, unitPrice: 0, notes: "" }
  ]);

  const { data: suppliers } = useListSuppliers({});
  const { data: materials } = useListMaterials({});
  const createPO = useCreatePurchaseOrder();

  const totalAmount = items.reduce((sum, i) => sum + (i.quantityOrdered * i.unitPrice), 0);

  function addItem() {
    setItems(prev => [...prev, { materialName: "", materialCode: "", unit: "", quantityOrdered: 1, unitPrice: 0, notes: "" }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof POItemForm, value: string | number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function selectMaterial(idx: number, materialId: string) {
    const mat = materials?.find(m => m.id === parseInt(materialId));
    if (!mat) return;
    setItems(prev => prev.map((item, i) => i === idx ? {
      ...item,
      materialId: mat.id,
      materialName: mat.name,
      materialCode: mat.code,
      unit: mat.unit,
      unitPrice: mat.unitPrice ?? 0,
    } : item));
  }

  function selectSupplier(id: string) {
    setSupplierId(id);
    const sup = suppliers?.find(s => s.id === parseInt(id));
    if (sup) setSupplierName(sup.name);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter(i => i.materialName && i.quantityOrdered > 0);
    if (!validItems.length) { toast({ title: "Tambahkan minimal 1 item", variant: "destructive" }); return; }

    const payload = {
      supplierId: supplierId ? parseInt(supplierId) : undefined,
      supplierName: supplierName || "Manual",
      requestedBy,
      priority: priority as "low" | "medium" | "high" | "urgent",
      expectedDelivery: expectedDelivery || undefined,
      notes: notes || undefined,
      terms: terms || undefined,
      items: validItems.map(i => ({
        materialId: i.materialId,
        materialName: i.materialName,
        materialCode: i.materialCode || undefined,
        unit: i.unit,
        quantityOrdered: i.quantityOrdered,
        unitPrice: i.unitPrice,
        notes: i.notes || undefined,
      })),
    };

    createPO.mutate(
      { data: payload },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
          toast({ title: `PO ${data.poNumber} berhasil dibuat` });
          navigate("/purchase-orders/" + data.id);
        },
        onError: () => toast({ title: "Gagal membuat PO", variant: "destructive" }),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders">
          <Button type="button" variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buat Purchase Order</h1>
          <p className="text-muted-foreground">Pengadaan material dari supplier</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier */}
          <Card>
            <CardHeader><CardTitle className="text-base">Informasi Supplier</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button type="button" variant={supplierMode === "existing" ? "default" : "outline"} size="sm" onClick={() => setSupplierMode("existing")}>Pilih dari Master</Button>
                <Button type="button" variant={supplierMode === "manual" ? "default" : "outline"} size="sm" onClick={() => setSupplierMode("manual")}>Input Manual</Button>
              </div>
              {supplierMode === "existing" ? (
                <div className="space-y-2">
                  <Label>Pilih Supplier</Label>
                  <Select value={supplierId} onValueChange={selectSupplier}>
                    <SelectTrigger><SelectValue placeholder="Pilih supplier..." /></SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} — {s.city ?? ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {supplierId && (() => {
                    const s = suppliers?.find(x => x.id === parseInt(supplierId));
                    return s ? (
                      <div className="text-xs text-muted-foreground space-y-0.5 border rounded-md p-2 bg-muted/30">
                        {s.contactPerson && <div>PIC: {s.contactPerson}</div>}
                        {s.phone && <div>Telp: {s.phone}</div>}
                        {s.paymentTerms && <div>Termin: {s.paymentTerms}</div>}
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Nama Supplier <span className="text-destructive">*</span></Label>
                  <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Nama vendor..." />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Item Material</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Tambah Item</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">Item #{idx + 1}</Badge>
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Pilih Material (opsional)</Label>
                      <Select onValueChange={v => selectMaterial(idx, v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih dari master material..." /></SelectTrigger>
                        <SelectContent>
                          {materials?.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.code})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nama Material <span className="text-destructive">*</span></Label>
                      <Input className="h-8 text-sm" value={item.materialName} onChange={e => updateItem(idx, "materialName", e.target.value)} placeholder="Nama material..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Satuan</Label>
                      <Input className="h-8 text-sm" value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} placeholder="pcs, kg, ltr..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Jumlah <span className="text-destructive">*</span></Label>
                      <Input className="h-8 text-sm" type="number" min="1" value={item.quantityOrdered} onChange={e => updateItem(idx, "quantityOrdered", parseInt(e.target.value) || 1)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Harga Satuan (Rp)</Label>
                      <Input className="h-8 text-sm" type="number" min="0" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold text-primary">
                      Subtotal: Rp {(item.quantityOrdered * item.unitPrice).toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-right text-base font-bold pt-2 border-t">
                Total PO: Rp {totalAmount.toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Detail PO</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Dibuat Oleh <span className="text-destructive">*</span></Label>
                <Input value={requestedBy} onChange={e => setRequestedBy(e.target.value)} placeholder="Nama Anda..." required />
              </div>
              <div className="space-y-2">
                <Label>Prioritas</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Rendah</SelectItem>
                    <SelectItem value="medium">Normal</SelectItem>
                    <SelectItem value="high">Tinggi</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Pengiriman</Label>
                <Input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Termin Pembayaran</Label>
                <Input value={terms} onChange={e => setTerms(e.target.value)} placeholder="30 days, COD..." />
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan untuk PO ini..." rows={3} />
              </div>
            </CardContent>
          </Card>
          <Button type="submit" className="w-full" disabled={createPO.isPending || !requestedBy || items.every(i => !i.materialName)}>
            {createPO.isPending ? "Membuat PO..." : "Buat Purchase Order"}
          </Button>
        </div>
      </div>
    </form>
  );
}
