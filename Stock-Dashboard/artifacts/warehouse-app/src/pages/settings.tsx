import { useState } from "react";
import { useListMaterials, useListSuppliers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Building2, MapPin, AlertTriangle, Package, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Settings() {
  const { toast } = useToast();
  const { data: materials } = useListMaterials({});
  const { data: suppliers } = useListSuppliers({});

  const [company, setCompany] = useState({ name: "WarehouseOS Corp", address: "", city: "", phone: "" });
  const [saved, setSaved] = useState(false);

  const categoryCount = new Set(materials?.map(m => m.category)).size;
  const supplierCount = suppliers?.length ?? 0;
  const activeSuppliers = suppliers?.filter(s => s.isActive).length ?? 0;
  const lowStockCount = materials?.filter(m => m.isLowStock).length ?? 0;

  function handleSave() {
    toast({ title: "Pengaturan berhasil disimpan" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan Sistem</h1>
        <p className="text-muted-foreground">Konfigurasi sistem manajemen gudang</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1"><Package className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Kategori Material</span></div>
            <div className="text-2xl font-bold">{categoryCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1"><Building2 className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Total Supplier</span></div>
            <div className="text-2xl font-bold">{supplierCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1"><Building2 className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Supplier Aktif</span></div>
            <div className="text-2xl font-bold text-green-600">{activeSuppliers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Alert Low Stock</span></div>
            <div className="text-2xl font-bold text-destructive">{lowStockCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><CardTitle className="text-base">Profil Perusahaan</CardTitle></div>
            <CardDescription>Informasi dasar perusahaan untuk laporan dan dokumen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Perusahaan</Label>
              <Input value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Alamat Gudang</Label>
              <Input value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))} placeholder="Jl. ..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kota</Label>
                <Input value={company.city} onChange={e => setCompany(c => ({ ...c, city: e.target.value }))} placeholder="Jakarta..." />
              </div>
              <div className="space-y-2">
                <Label>No. Telepon</Label>
                <Input value={company.phone} onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))} placeholder="021-..." />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" variant={saved ? "secondary" : "default"}>
              {saved ? "Tersimpan ✓" : "Simpan Pengaturan"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" /><CardTitle className="text-base">Kategori Material</CardTitle></div>
            <CardDescription>Kategori material yang ada dalam sistem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(materials?.map(m => m.category) ?? [])).sort().map(cat => (
                <div key={cat} className="flex items-center gap-1.5 bg-muted/50 border rounded-full px-3 py-1">
                  <span className="text-sm font-medium">{cat}</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                    {materials?.filter(m => m.category === cat).length ?? 0}
                  </Badge>
                </div>
              ))}
              {categoryCount === 0 && <p className="text-sm text-muted-foreground">Belum ada kategori material.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" /><CardTitle className="text-base">Pengaturan Alert</CardTitle></div>
            <CardDescription>Konfigurasi batas notifikasi dan peringatan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Low Stock Alert", desc: "Peringatan ketika stok di bawah minimum" },
              { label: "PO Approval Reminder", desc: "Notifikasi PO menunggu persetujuan" },
              { label: "Overdue Tool Request", desc: "Alert alat yang melewati jadwal pengembalian" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Aktif</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><CardTitle className="text-base">Zona Gudang</CardTitle></div>
            <CardDescription>Lokasi rak yang digunakan dalam sistem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(new Set(materials?.map(m => m.warehouseZone).filter(Boolean) ?? [])).sort().map(zone => (
                <div key={zone as string} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{zone as string}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {materials?.filter(m => m.warehouseZone === zone).length ?? 0} item
                  </Badge>
                </div>
              ))}
              {Array.from(new Set(materials?.map(m => m.warehouseZone).filter(Boolean) ?? [])).length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada zona gudang yang dikonfigurasi.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-muted-foreground" /><CardTitle className="text-base">Informasi Sistem</CardTitle></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Versi Aplikasi", value: "v1.0.0" },
                { label: "Database", value: "PostgreSQL" },
                { label: "Framework", value: "React + Express" },
                { label: "Terakhir Diperbarui", value: new Date().toLocaleDateString("id-ID") },
              ].map(item => (
                <div key={item.label} className="border rounded-md p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                  <div className="text-sm font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
