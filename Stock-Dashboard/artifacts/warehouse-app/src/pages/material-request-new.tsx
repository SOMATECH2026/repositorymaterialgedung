import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateMaterialRequest, useListMaterials, getListMaterialRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RequestItem { materialId: number; materialName: string; quantity: number; notes: string; }

export function MaterialRequestNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    requesterName: "", department: "", workLocation: "", jobType: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    neededDate: "", notes: "",
  });
  const [items, setItems] = useState<RequestItem[]>([{ materialId: 0, materialName: "", quantity: 1, notes: "" }]);

  const { data: materials } = useListMaterials({});
  const createRequest = useCreateMaterialRequest();

  function updateItem(idx: number, field: keyof RequestItem, value: string | number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === "materialId") {
        const mat = materials?.find(m => m.id === Number(value));
        return { ...item, materialId: Number(value), materialName: mat?.name ?? "" };
      }
      return { ...item, [field]: value };
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter(i => i.materialId > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Tambahkan minimal satu item material", variant: "destructive" });
      return;
    }
    createRequest.mutate(
      {
        data: {
          ...form,
          items: validItems.map(i => ({ materialId: i.materialId, quantity: i.quantity, notes: i.notes || undefined })),
        },
      },
      {
        onSuccess: (req) => {
          queryClient.invalidateQueries({ queryKey: getListMaterialRequestsQueryKey() });
          toast({ title: "Pengajuan berhasil dibuat", description: req.requestNumber });
          navigate("/material-requests");
        },
        onError: () => toast({ title: "Gagal membuat pengajuan", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/material-requests")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Pengajuan Material</h1>
          <p className="text-muted-foreground">Isi formulir pengajuan kebutuhan material</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informasi Pengaju</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Pengaju <span className="text-destructive">*</span></Label>
              <Input required value={form.requesterName} onChange={e => setForm(f => ({ ...f, requesterName: e.target.value }))} placeholder="Nama lengkap..." data-testid="input-requester-name" />
            </div>
            <div className="space-y-2">
              <Label>Departemen <span className="text-destructive">*</span></Label>
              <Input required value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Departemen..." data-testid="input-department" />
            </div>
            <div className="space-y-2">
              <Label>Lokasi Kerja</Label>
              <Input value={form.workLocation} onChange={e => setForm(f => ({ ...f, workLocation: e.target.value }))} placeholder="Lokasi pekerjaan..." data-testid="input-work-location" />
            </div>
            <div className="space-y-2">
              <Label>Jenis Pekerjaan</Label>
              <Input value={form.jobType} onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))} placeholder="Jenis pekerjaan..." data-testid="input-job-type" />
            </div>
            <div className="space-y-2">
              <Label>Prioritas</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as typeof form.priority }))}>
                <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Kebutuhan</Label>
              <Input type="date" value={form.neededDate} onChange={e => setForm(f => ({ ...f, neededDate: e.target.value }))} data-testid="input-needed-date" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Catatan</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan tambahan..." data-testid="input-notes" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daftar Material</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems(p => [...p, { materialId: 0, materialName: "", quantity: 1, notes: "" }])} data-testid="button-add-item">
              <Plus className="h-4 w-4 mr-1" /> Tambah Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-end" data-testid={`item-row-${idx}`}>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Material</Label>
                  <Select value={item.materialId ? String(item.materialId) : ""} onValueChange={v => updateItem(idx, "materialId", v)}>
                    <SelectTrigger data-testid={`select-material-${idx}`}><SelectValue placeholder="Pilih material..." /></SelectTrigger>
                    <SelectContent>
                      {materials?.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Jumlah</Label>
                  <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value))} data-testid={`input-quantity-${idx}`} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Catatan</Label>
                  <Input value={item.notes} onChange={e => updateItem(idx, "notes", e.target.value)} placeholder="Opsional..." data-testid={`input-item-notes-${idx}`} />
                </div>
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItems(p => p.filter((_, i) => i !== idx))} data-testid={`button-remove-item-${idx}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/material-requests")}>Batal</Button>
          <Button type="submit" disabled={createRequest.isPending} data-testid="button-submit-request">
            {createRequest.isPending ? "Menyimpan..." : "Buat Pengajuan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
