import { useState } from "react";
import { useListMaterials, useGetInventoryValue, useGetTopMaterials, useGetStockCard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, Package, DollarSign, BarChart2, FileText } from "lucide-react";
import { ExportMenu } from "@/components/export-menu";
import type { ExportColumn } from "@/lib/export";

const CHART_COLORS = ["#1e2d46", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16"];

const INVENTORY_EXPORT_COLS: ExportColumn[] = [
  { header: "Kode", key: "materialCode", width: 14 },
  { header: "Material", key: "materialName", width: 28 },
  { header: "Kategori", key: "category", width: 16 },
  { header: "Stok", key: "currentStock", width: 10 },
  { header: "Harga Satuan", key: "unitPrice", width: 14 },
  { header: "Nilai Total", key: "totalValue", width: 16 },
];
const TOP_MAT_COLS: ExportColumn[] = [
  { header: "Material", key: "materialName", width: 28 },
  { header: "Kode", key: "materialCode", width: 14 },
  { header: "Kategori", key: "category", width: 16 },
  { header: "Total Qty Keluar", key: "totalQty", width: 16 },
  { header: "Jumlah Transaksi", key: "transactionCount", width: 18 },
];
const STOCK_CARD_COLS: ExportColumn[] = [
  { header: "Tanggal", key: "dateFmt", width: 16 },
  { header: "Tipe", key: "type", width: 14 },
  { header: "Jumlah", key: "qty", width: 10 },
  { header: "Saldo", key: "balance", width: 10 },
  { header: "Keterangan", key: "reason", width: 32 },
  { header: "Referensi", key: "reference", width: 16 },
  { header: "Pelaksana", key: "performedBy", width: 18 },
];

export function Reports() {
  const [activeTab, setActiveTab] = useState("inventory-value");
  const [stockCardMaterialId, setStockCardMaterialId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: inventoryValue, isLoading: ivLoading } = useGetInventoryValue();
  const { data: topMaterials, isLoading: tmLoading } = useGetTopMaterials({ limit: 10 });
  const { data: materials } = useListMaterials({});
  const stockCardParams = stockCardMaterialId
    ? { materialId: parseInt(stockCardMaterialId), startDate: startDate || undefined, endDate: endDate || undefined }
    : { materialId: 0 };
  const { data: stockCard, isLoading: scLoading } = useGetStockCard(
    stockCardParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!stockCardMaterialId } } as any
  );

  // Category pie data
  const categoryData = inventoryValue?.items.reduce<Record<string, number>>((acc, item) => {
    const cat = item.category ?? "Uncategorized";
    acc[cat] = (acc[cat] ?? 0) + item.totalValue;
    return acc;
  }, {});
  const pieData = Object.entries(categoryData ?? {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  const inventoryExportData = (inventoryValue?.items ?? []).map(i => ({
    ...i,
    materialCode: i.materialCode ?? "-",
  })) as unknown as Record<string, unknown>[];

  const topMaterialsExportData = (topMaterials ?? []) as unknown as Record<string, unknown>[];

  const stockCardExportData = (stockCard?.transactions ?? []).map(t => ({
    ...t,
    dateFmt: new Date(t.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
    reference: t.reference ?? "-",
  })) as unknown as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan & Analitik</h1>
          <p className="text-muted-foreground">Analisis performa gudang dan nilai inventaris</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory-value" className="gap-2"><DollarSign className="h-4 w-4" />Nilai Inventaris</TabsTrigger>
          <TabsTrigger value="top-materials" className="gap-2"><BarChart2 className="h-4 w-4" />Material Terlaris</TabsTrigger>
          <TabsTrigger value="stock-card" className="gap-2"><FileText className="h-4 w-4" />Kartu Stok</TabsTrigger>
        </TabsList>

        {/* ── INVENTORY VALUE ── */}
        <TabsContent value="inventory-value" className="space-y-4 mt-4">
          {ivLoading ? <Skeleton className="h-40 w-full" /> : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><DollarSign className="h-5 w-5 text-blue-600" /></div>
                      <div>
                        <div className="text-xl font-bold">Rp {(inventoryValue?.totalValue ?? 0).toLocaleString("id-ID")}</div>
                        <div className="text-xs text-muted-foreground">Total Nilai Inventaris</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><Package className="h-5 w-5 text-green-600" /></div>
                      <div>
                        <div className="text-xl font-bold">{inventoryValue?.totalItems ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Total Item Material</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><BarChart2 className="h-5 w-5 text-purple-600" /></div>
                      <div>
                        <div className="text-xl font-bold">{pieData.length}</div>
                        <div className="text-xs text-muted-foreground">Kategori Aktif</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Distribusi Nilai per Kategori</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                            {pieData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `Rp ${v.toLocaleString("id-ID")}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Top 10 Nilai Tertinggi</CardTitle>
                    <ExportMenu data={inventoryExportData} columns={INVENTORY_EXPORT_COLS} title="Nilai Inventaris" filename="laporan-nilai-inventaris" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-y-auto max-h-52">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b bg-muted/30"><th className="text-left px-3 py-2">Material</th><th className="text-right px-3 py-2">Stok</th><th className="text-right px-3 py-2">Nilai</th></tr></thead>
                        <tbody className="divide-y">
                          {inventoryValue?.items.slice(0, 10).map(i => (
                            <tr key={i.materialId} className="hover:bg-muted/20">
                              <td className="px-3 py-2">
                                <div className="font-medium truncate max-w-[160px]">{i.materialName}</div>
                                <div className="text-muted-foreground">{i.category}</div>
                              </td>
                              <td className="px-3 py-2 text-right">{i.currentStock}</td>
                              <td className="px-3 py-2 text-right font-semibold">{i.totalValue > 0 ? `Rp ${i.totalValue.toLocaleString("id-ID")}` : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── TOP MATERIALS ── */}
        <TabsContent value="top-materials" className="space-y-4 mt-4">
          {tmLoading ? <Skeleton className="h-40 w-full" /> : (
            <>
              <div className="flex justify-end">
                <ExportMenu data={topMaterialsExportData} columns={TOP_MAT_COLS} title="Material Terlaris 30 Hari" filename="laporan-top-material" />
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 Material Paling Banyak Digunakan (30 Hari Terakhir)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topMaterials} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="materialName" width={140} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `${v} unit`} />
                        <Bar dataKey="totalQty" fill="#1e2d46" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Material</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Kategori</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total Qty Keluar</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Transaksi</th>
                    </tr></thead>
                    <tbody className="divide-y">
                      {topMaterials?.map((m, idx) => (
                        <tr key={m.materialId} className="hover:bg-muted/20">
                          <td className="px-4 py-3 text-muted-foreground font-bold">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{m.materialName}</div>
                            <div className="text-xs text-muted-foreground font-mono">{m.materialCode}</div>
                          </td>
                          <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{m.category}</Badge></td>
                          <td className="px-4 py-3 text-right">
                            <span className="flex items-center justify-end gap-1 font-semibold text-orange-600"><TrendingDown className="h-3.5 w-3.5" />{m.totalQty}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{m.transactionCount}x</td>
                        </tr>
                      ))}
                      {(!topMaterials || topMaterials.length === 0) && (
                        <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Belum ada data pemakaian dalam 30 hari terakhir</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── STOCK CARD ── */}
        <TabsContent value="stock-card" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Pilih Material &amp; Periode</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Material</Label>
                  <Select value={stockCardMaterialId} onValueChange={setStockCardMaterialId}>
                    <SelectTrigger><SelectValue placeholder="Pilih material..." /></SelectTrigger>
                    <SelectContent>
                      {materials?.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dari</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sampai</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {stockCardMaterialId && (
            scLoading ? <Skeleton className="h-40 w-full" /> : stockCard ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{stockCard.materialName}</CardTitle>
                    <p className="text-sm text-muted-foreground">Kode: {stockCard.materialCode} · Stok saat ini: <strong>{stockCard.currentStock}</strong></p>
                  </div>
                  <ExportMenu data={stockCardExportData} columns={STOCK_CARD_COLS} title={`Kartu Stok — ${stockCard.materialName}`} filename={`kartu-stok-${stockCard.materialCode}`} />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tanggal</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tipe</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Jumlah</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Saldo</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Keterangan</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Referensi</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Pelaksana</th>
                      </tr></thead>
                      <tbody className="divide-y">
                        {stockCard.transactions.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Tidak ada transaksi pada periode ini</td></tr>
                        )}
                        {stockCard.transactions.map(t => (
                          <tr key={t.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap text-xs">{new Date(t.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                            <td className="px-4 py-2.5">
                              <Badge className={`text-xs ${t.type === "stock_in" ? "bg-green-100 text-green-700" : t.type === "stock_out" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                {t.type === "stock_in" ? "Masuk" : t.type === "stock_out" ? "Keluar" : "Adj"}
                              </Badge>
                            </td>
                            <td className={`px-4 py-2.5 text-right font-mono font-semibold ${t.qty > 0 ? "text-green-600" : "text-red-600"}`}>
                              {t.qty > 0 ? "+" : ""}{t.qty}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold">{t.balance}</td>
                            <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{t.reason}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{t.reference ?? "-"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{t.performedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : null
          )}

          {!stockCardMaterialId && (
            <div className="text-center py-16 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
              Pilih material untuk melihat kartu stok
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
