import { useState } from "react";
import {
  useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MoreHorizontal, Building2, Phone, Mail, MapPin } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ExportMenu } from "@/components/export-menu";
import type { ExportColumn } from "@/lib/export";

const CATEGORIES = ["Umum", "Bahan Baku", "Suku Cadang", "Kimia", "Elektronik", "Mekanik", "Konstruksi", "Safety", "Jasa"];

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Kode", key: "code", width: 12 },
  { header: "Nama Supplier", key: "name", width: 28 },
  { header: "Kategori", key: "category", width: 16 },
  { header: "Kontak PIC", key: "contactPerson", width: 20 },
  { header: "Email", key: "email", width: 24 },
  { header: "Telepon", key: "phone", width: 16 },
  { header: "Kota", key: "city", width: 14 },
  { header: "NPWP", key: "npwp", width: 18 },
  { header: "Terms Pembayaran", key: "paymentTerms", width: 18 },
  { header: "Lead Time", key: "leadTimeDays", width: 12 },
  { header: "Status", key: "statusLabel", width: 10 },
];

type SupplierForm = {
  name: string; category: string; contactPerson: string; email: string;
  phone: string; address: string; city: string; npwp: string;
  paymentTerms: string; leadTimeDays: string; notes: string;
};
const emptyForm: SupplierForm = {
  name: "", category: "Umum", contactPerson: "", email: "",
  phone: "", address: "", city: "", npwp: "",
  paymentTerms: "30 days", leadTimeDays: "", notes: "",
};

export function Suppliers() {
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ type: "create" | "edit"; id?: number; form: SupplierForm } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: suppliers, isLoading } = useListSuppliers({ search: search || undefined });
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const exportData = (suppliers ?? []).map(s => ({
    ...s,
    contactPerson: s.contactPerson ?? "-",
    email: s.email ?? "-",
    phone: s.phone ?? "-",
    city: s.city ?? "-",
    npwp: s.npwp ?? "-",
    paymentTerms: s.paymentTerms ?? "-",
    leadTimeDays: s.leadTimeDays ?? "-",
    statusLabel: s.isActive ? "Aktif" : "Nonaktif",
  })) as unknown as Record<string, unknown>[];

  function openCreate() { setDialog({ type: "create", form: { ...emptyForm } }); }
  function openEdit(s: NonNullable<typeof suppliers>[0]) {
    setDialog({
      type: "edit", id: s.id,
      form: {
        name: s.name, category: s.category, contactPerson: s.contactPerson ?? "",
        email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "",
        city: s.city ?? "", npwp: s.npwp ?? "", paymentTerms: s.paymentTerms ?? "30 days",
        leadTimeDays: s.leadTimeDays ?? "", notes: s.notes ?? "",
      },
    });
  }

  function handleSave() {
    if (!dialog) return;
    const { form } = dialog;
    const payload = {
      name: form.name, category: form.category,
      contactPerson: form.contactPerson || undefined, email: form.email || undefined,
      phone: form.phone || undefined, address: form.address || undefined,
      city: form.city || undefined, npwp: form.npwp || undefined,
      paymentTerms: form.paymentTerms || undefined, leadTimeDays: form.leadTimeDays || undefined,
      notes: form.notes || undefined,
    };
    if (dialog.type === "create") {
      createSupplier.mutate(
        { data: payload },
        {
          onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setDialog(null); toast({ title: "Supplier berhasil ditambahkan" }); },
          onError: () => toast({ title: "Gagal menyimpan supplier", variant: "destructive" }),
        }
      );
    } else if (dialog.id) {
      updateSupplier.mutate(
        { id: dialog.id, data: payload },
        {
          onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setDialog(null); toast({ title: "Supplier berhasil diperbarui" }); },
          onError: () => toast({ title: "Gagal memperbarui supplier", variant: "destructive" }),
        }
      );
    }
  }

  function handleDelete(id: number, name: string) {
    if (!confirm(`Hapus supplier "${name}"? Data tidak dapat dikembalikan.`)) return;
    deleteSupplier.mutate(
      { id },
      {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier berhasil dihapus" }); },
        onError: () => toast({ title: "Gagal menghapus supplier", variant: "destructive" }),
      }
    );
  }

  function updateForm(field: keyof SupplierForm, value: string) {
    setDialog(d => d ? { ...d, form: { ...d.form, [field]: value } } : null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Supplier</h1>
          <p className="text-muted-foreground">Kelola data vendor dan pemasok material</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu data={exportData} columns={EXPORT_COLUMNS} title="Master Supplier" filename="master-supplier" />
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Tambah Supplier</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{suppliers?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">Total Supplier</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{suppliers?.filter(s => s.isActive).length ?? 0}</div>
            <div className="text-sm text-muted-foreground">Aktif</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{new Set(suppliers?.map(s => s.category)).size ?? 0}</div>
            <div className="text-sm text-muted-foreground">Kategori</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama supplier, kode..." className="pl-9 max-w-md" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kode</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama Supplier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kategori</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kontak</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lokasi</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Terms</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {suppliers?.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                      <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Belum ada supplier. Tambahkan supplier pertama Anda.
                    </td></tr>
                  )}
                  {suppliers?.map(s => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.name}</div>
                        {s.npwp && <div className="text-xs text-muted-foreground">NPWP: {s.npwp}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {s.contactPerson && <div className="text-sm">{s.contactPerson}</div>}
                        {s.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{s.phone}</div>}
                        {s.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{s.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        {s.city && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">
                        <div>{s.paymentTerms ?? "-"}</div>
                        {s.leadTimeDays && <div className="text-xs">Lead: {s.leadTimeDays}h</div>}
                      </td>
                      <td className="px-4 py-3">
                        {s.isActive
                          ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Aktif</Badge>
                          : <Badge variant="secondary" className="text-xs">Nonaktif</Badge>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(s)}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(s.id, s.name)}>Hapus</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dialog?.type === "create" ? "Tambah Supplier" : "Edit Supplier"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nama Supplier <span className="text-destructive">*</span></Label>
              <Input value={dialog?.form.name ?? ""} onChange={e => updateForm("name", e.target.value)} placeholder="Nama perusahaan/vendor..." />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={dialog?.form.category ?? "Umum"} onValueChange={v => updateForm("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kota</Label>
              <Input value={dialog?.form.city ?? ""} onChange={e => updateForm("city", e.target.value)} placeholder="Jakarta, Surabaya..." />
            </div>
            <div className="space-y-2">
              <Label>Kontak PIC</Label>
              <Input value={dialog?.form.contactPerson ?? ""} onChange={e => updateForm("contactPerson", e.target.value)} placeholder="Nama kontak..." />
            </div>
            <div className="space-y-2">
              <Label>No. Telepon</Label>
              <Input value={dialog?.form.phone ?? ""} onChange={e => updateForm("phone", e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={dialog?.form.email ?? ""} onChange={e => updateForm("email", e.target.value)} placeholder="email@supplier.com" />
            </div>
            <div className="space-y-2">
              <Label>NPWP</Label>
              <Input value={dialog?.form.npwp ?? ""} onChange={e => updateForm("npwp", e.target.value)} placeholder="00.000.000.0-000.000" />
            </div>
            <div className="space-y-2">
              <Label>Termin Pembayaran</Label>
              <Select value={dialog?.form.paymentTerms ?? "30 days"} onValueChange={v => updateForm("paymentTerms", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Tunai / Cash</SelectItem>
                  <SelectItem value="7 days">7 Hari</SelectItem>
                  <SelectItem value="14 days">14 Hari</SelectItem>
                  <SelectItem value="30 days">30 Hari</SelectItem>
                  <SelectItem value="45 days">45 Hari</SelectItem>
                  <SelectItem value="60 days">60 Hari</SelectItem>
                  <SelectItem value="90 days">90 Hari</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lead Time (Hari)</Label>
              <Input type="number" min="1" value={dialog?.form.leadTimeDays ?? ""} onChange={e => updateForm("leadTimeDays", e.target.value)} placeholder="7" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Alamat</Label>
              <Input value={dialog?.form.address ?? ""} onChange={e => updateForm("address", e.target.value)} placeholder="Jl. ..." />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Catatan</Label>
              <Textarea value={dialog?.form.notes ?? ""} onChange={e => updateForm("notes", e.target.value)} placeholder="Catatan tambahan tentang supplier..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button onClick={handleSave} disabled={createSupplier.isPending || updateSupplier.isPending || !dialog?.form.name}>
              {createSupplier.isPending || updateSupplier.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
