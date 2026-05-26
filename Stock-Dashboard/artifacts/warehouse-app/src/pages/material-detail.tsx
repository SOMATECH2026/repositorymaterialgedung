import { useParams, useLocation } from "wouter";
import { useGetMaterial, useListStockMovements, getGetMaterialQueryKey, useDeleteMaterial } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, TrendingDown, TrendingUp, RefreshCw } from "lucide-react";
import { Link } from "wouter";

export function MaterialDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const { data: material, isLoading } = useGetMaterial(id, { query: { enabled: !!id, queryKey: getGetMaterialQueryKey(id) } });
  const { data: movements } = useListStockMovements({ materialId: id, limit: 20 });

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!material) return (
    <div className="text-center py-16 text-muted-foreground">Material tidak ditemukan</div>
  );

  const stockPct = material.maximumStock > 0 ? Math.min(100, (material.currentStock / material.maximumStock) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/materials")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{material.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">{material.code}</p>
        </div>
        {material.isLowStock && <Badge variant="destructive">Low Stock</Badge>}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Informasi Material</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Kategori", material.category],
                ["Sub Kategori", material.subCategory ?? "-"],
                ["Brand", material.brand ?? "-"],
                ["Satuan", material.unit],
                ["Spesifikasi", material.specification ?? "-"],
                ["Supplier", material.supplier ?? "-"],
                ["Lokasi Rak", material.rackLocation ?? "-"],
                ["Zona Gudang", material.warehouseZone ?? "-"],
                ["Harga Satuan", material.unitPrice != null ? `Rp ${Number(material.unitPrice).toLocaleString("id-ID")}` : "-"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Status Stok</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{material.currentStock}</div>
              <div className="text-sm text-muted-foreground">{material.unit}</div>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${material.isLowStock ? "bg-destructive" : "bg-green-500"}`}
                  style={{ width: `${stockPct}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                <span>Min: {material.minimumStock}</span>
                <span>Max: {material.maximumStock}</span>
              </div>
              {(material.reservedStock ?? 0) > 0 && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Reserved: {material.reservedStock} {material.unit}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
              <div>Dibuat: {material.createdAt ? new Date(material.createdAt).toLocaleDateString("id-ID") : "-"}</div>
              <div>Diperbarui: {material.updatedAt ? new Date(material.updatedAt).toLocaleDateString("id-ID") : "-"}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Riwayat Transaksi</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!movements?.length ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Belum ada transaksi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tanggal</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tipe</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Jumlah</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Stok Sebelum</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Stok Sesudah</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Keterangan</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements.map(m => (
                    <tr key={m.id} className="hover:bg-muted/20" data-testid={`row-movement-${m.id}`}>
                      <td className="px-4 py-2 text-muted-foreground">{new Date(m.createdAt).toLocaleDateString("id-ID")}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          {m.type === "stock_in" ? <TrendingUp className="h-3 w-3 text-green-500" /> : m.type === "stock_out" ? <TrendingDown className="h-3 w-3 text-red-500" /> : <RefreshCw className="h-3 w-3 text-amber-500" />}
                          <span className={m.type === "stock_in" ? "text-green-600 dark:text-green-400" : m.type === "stock_out" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}>
                            {m.type === "stock_in" ? "Masuk" : m.type === "stock_out" ? "Keluar" : "Adj."}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">{m.quantity > 0 ? "+" : ""}{m.quantity}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{m.previousStock}</td>
                      <td className="px-4 py-2 text-right font-semibold">{m.newStock}</td>
                      <td className="px-4 py-2 text-muted-foreground">{m.reason}</td>
                      <td className="px-4 py-2 text-muted-foreground">{m.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
