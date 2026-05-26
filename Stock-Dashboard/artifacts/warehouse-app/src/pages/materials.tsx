import { useState } from "react";
import { Link } from "wouter";
import {
  useListMaterials, useListMaterialCategories,
  useDeleteMaterial, useAdjustMaterialStock,
  getListMaterialsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Plus, Search, Trash2, TrendingDown, TrendingUp, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExportMenu } from "@/components/export-menu";
import type { ExportColumn } from "@/lib/export";

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Kode", key: "code", width: 14 },
  { header: "Nama Material", key: "name", width: 28 },
  { header: "Kategori", key: "category", width: 16 },
  { header: "Sub Kategori", key: "subCategory", width: 16 },
  { header: "Brand", key: "brand", width: 14 },
  { header: "Satuan", key: "unit", width: 10 },
  { header: "Stok Saat Ini", key: "currentStock", width: 14 },
  { header: "Stok Minimum", key: "minimumStock", width: 14 },
  { header: "Stok Maksimum", key: "maximumStock", width: 14 },
  { header: "Lokasi Rak", key: "rackLocation", width: 14 },
  { header: "Status", key: "stockStatus", width: 12 },
];

export function Materials() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; materialId: number; materialName: string; currentStock: number } | null>(null);
  const [adjustType, setAdjustType] = useState<"stock_in" | "stock_out" | "adjustment">("stock_in");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: materials, isLoading } = useListMaterials({
    search: search || undefined,
    category: category === "all" ? undefined : category,
    lowStock: showLowStock || undefined,
  });

  const { data: categories } = useListMaterialCategories();
  const deleteMaterial = useDeleteMaterial();
  const adjustStock = useAdjustMaterialStock();

  const lowStockCount = materials?.filter(m => m.isLowStock).length ?? 0;

  const exportData = (materials ?? []).map(m => ({
    ...m,
    stockStatus: m.isLowStock ? "Low Stock" : "Normal",
    subCategory: m.subCategory ?? "-",
    brand: m.brand ?? "-",
    rackLocation: m.rackLocation ?? "-",
  })) as unknown as Record<string, unknown>[];

  function handleDelete(id: number, name: string) {
    if (!confirm(`Hapus material "${name}"? Data tidak dapat dikembalikan.`)) return;
    deleteMaterial.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
          toast({ title: "Material berhasil dihapus" });
        },
        onError: () => toast({ title: "Gagal menghapus material", variant: "destructive" }),
      }
    );
  }

  function handleAdjust() {
    if (!adjustDialog || !adjustQty || !adjustReason) return;
    adjustStock.mutate(
      { id: adjustDialog.materialId, data: { type: adjustType, quantity: parseInt(adjustQty), reason: adjustReason } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
          setAdjustDialog(null);
          setAdjustQty("");
          setAdjustReason("");
          toast({ title: "Stok berhasil diperbarui" });
        },
        onError: () => toast({ title: "Gagal memperbarui stok", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Material</h1>
          <p className="text-muted-foreground">Kelola stok dan data material gudang</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu data={exportData} columns={EXPORT_COLUMNS} title="Inventory Material" filename="inventory-material" />
          <Link href="/materials/new">
            <Button data-testid="button-add-material">
              <Plus className="h-4 w-4 mr-2" /> Tambah Material
            </Button>
          </Link>
        </div>
      </div>

      {lowStockCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">{lowStockCount} material di bawah stok minimum</span>
            <Button variant="link" size="sm" className="text-destructive p-0 h-auto" onClick={() => setShowLowStock(true)}>
              Lihat semua
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari material, kode..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStock ? "default" : "outline"}
              size="sm"
              onClick={() => setShowLowStock(!showLowStock)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" /> Low Stock
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kode</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama Material</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kategori</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Satuan</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stok</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Min</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lokasi</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {materials?.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Tidak ada material ditemukan</td></tr>
                  )}
                  {materials?.map(m => (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.code}</td>
                      <td className="px-4 py-3">
                        <Link href={`/materials/${m.id}`} className="font-medium hover:text-primary transition-colors">{m.name}</Link>
                        {m.brand && <div className="text-xs text-muted-foreground">{m.brand}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.unit}</td>
                      <td className="px-4 py-3 text-right font-semibold">{m.currentStock}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{m.minimumStock}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{m.rackLocation ?? "-"}</td>
                      <td className="px-4 py-3">
                        {m.isLowStock
                          ? <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                          : <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Normal</Badge>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/materials/${m.id}`}>Lihat Detail</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setAdjustDialog({ open: true, materialId: m.id, materialName: m.name, currentStock: m.currentStock }); setAdjustType("stock_in"); }}>
                              <TrendingUp className="h-3 w-3 mr-2" /> Barang Masuk
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setAdjustDialog({ open: true, materialId: m.id, materialName: m.name, currentStock: m.currentStock }); setAdjustType("stock_out"); }}>
                              <TrendingDown className="h-3 w-3 mr-2" /> Barang Keluar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(m.id, m.name)}
                            >
                              <Trash2 className="h-3 w-3 mr-2" /> Hapus
                            </DropdownMenuItem>
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

      <Dialog open={!!adjustDialog?.open} onOpenChange={(open) => !open && setAdjustDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Penyesuaian Stok — {adjustDialog?.materialName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Stok saat ini: <span className="font-bold text-foreground">{adjustDialog?.currentStock}</span></div>
            <div className="space-y-2">
              <Label>Tipe Transaksi</Label>
              <Select value={adjustType} onValueChange={v => setAdjustType(v as typeof adjustType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock_in">Barang Masuk (+)</SelectItem>
                  <SelectItem value="stock_out">Barang Keluar (-)</SelectItem>
                  <SelectItem value="adjustment">Adjustment (Set)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input type="number" min="1" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="Masukkan jumlah..." />
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Alasan penyesuaian..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>Batal</Button>
            <Button onClick={handleAdjust} disabled={adjustStock.isPending}>
              {adjustStock.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
