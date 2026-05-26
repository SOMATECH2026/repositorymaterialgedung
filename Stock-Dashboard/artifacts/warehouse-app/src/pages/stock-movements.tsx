import { useState } from "react";
import { useListStockMovements, useDeleteStockMovement, getListStockMovementsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, TrendingDown, RefreshCw, ArrowLeftRight, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExportMenu } from "@/components/export-menu";
import type { ExportColumn } from "@/lib/export";

const TYPE_LABELS: Record<string, string> = {
  stock_in: "Barang Masuk", stock_out: "Barang Keluar",
  adjustment: "Adjustment", transfer: "Transfer",
};
const TYPE_COLORS: Record<string, string> = {
  stock_in: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  stock_out: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  adjustment: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  transfer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};
const TypeIcon = ({ type }: { type: string }) => {
  if (type === "stock_in") return <TrendingUp className="h-3.5 w-3.5" />;
  if (type === "stock_out") return <TrendingDown className="h-3.5 w-3.5" />;
  if (type === "transfer") return <ArrowLeftRight className="h-3.5 w-3.5" />;
  return <RefreshCw className="h-3.5 w-3.5" />;
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Tanggal", key: "dateFmt", width: 16 },
  { header: "Tipe", key: "typeLabel", width: 16 },
  { header: "Kode Material", key: "materialCode", width: 14 },
  { header: "Nama Material", key: "materialName", width: 28 },
  { header: "Jumlah", key: "quantity", width: 10 },
  { header: "Stok Sebelum", key: "previousStock", width: 13 },
  { header: "Stok Sesudah", key: "newStock", width: 13 },
  { header: "Keterangan", key: "reason", width: 30 },
  { header: "Pelaksana", key: "performedBy", width: 18 },
  { header: "Referensi", key: "reference", width: 16 },
];

export function StockMovements() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: movements, isLoading } = useListStockMovements({
    type: type === "all" ? undefined : type,
    limit: 200,
  });

  const deleteMovement = useDeleteStockMovement();

  const filtered = movements?.filter(m =>
    !search ||
    m.materialName.toLowerCase().includes(search.toLowerCase()) ||
    (m.materialCode ?? "").toLowerCase().includes(search.toLowerCase()) ||
    m.reason.toLowerCase().includes(search.toLowerCase()) ||
    m.performedBy.toLowerCase().includes(search.toLowerCase())
  );

  const exportData = (filtered ?? []).map(m => ({
    ...m,
    typeLabel: TYPE_LABELS[m.type] ?? m.type,
    dateFmt: new Date(m.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
    materialCode: m.materialCode ?? "-",
    reference: m.reference ?? "-",
  })) as unknown as Record<string, unknown>[];

  function handleDelete(id: number) {
    if (!confirm("Hapus riwayat transaksi ini? Data tidak dapat dikembalikan.")) return;
    deleteMovement.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStockMovementsQueryKey() });
          toast({ title: "Transaksi berhasil dihapus" });
        },
        onError: () => toast({ title: "Gagal menghapus transaksi", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Riwayat Pergerakan Stok</h1>
          <p className="text-muted-foreground">Histori semua transaksi masuk dan keluar material</p>
        </div>
        <ExportMenu data={exportData} columns={EXPORT_COLUMNS} title="Riwayat Pergerakan Stok" filename="stock-movements" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari material, keterangan, pelaksana..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipe Transaksi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tanggal</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipe</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Material</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Jumlah</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stok Sebelum</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stok Sesudah</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Keterangan</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pelaksana</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered?.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Tidak ada data pergerakan stok</td></tr>
                  )}
                  {filtered?.map(m => (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs flex items-center gap-1 w-fit ${TYPE_COLORS[m.type] ?? ""}`}>
                          <TypeIcon type={m.type} />
                          {TYPE_LABELS[m.type] ?? m.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.materialName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{m.materialCode ?? ""}</div>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${m.quantity > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {m.quantity > 0 ? "+" : ""}{m.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{m.previousStock}</td>
                      <td className="px-4 py-3 text-right font-semibold">{m.newStock}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{m.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.performedBy}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(m.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
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
