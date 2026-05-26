import { useState } from "react";
import { Link } from "wouter";
import {
  useListTools, useGetToolStats, useUpdateToolStatus, useDeleteTool,
  getListToolsQueryKey, getGetToolStatsQueryKey,
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
import { Plus, Search, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ExportMenu } from "@/components/export-menu";
import type { ExportColumn } from "@/lib/export";

const STATUS_LABELS: Record<string, string> = {
  available: "Tersedia", in_use: "Digunakan", maintenance: "Maintenance",
  calibration: "Kalibrasi", damaged: "Rusak", lost: "Hilang",
};
const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  in_use: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  maintenance: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  calibration: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  damaged: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  lost: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};
const CONDITION_LABELS: Record<string, string> = { good: "Baik", fair: "Cukup", poor: "Buruk", damaged: "Rusak" };

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Kode", key: "code", width: 14 },
  { header: "Nama Alat", key: "name", width: 26 },
  { header: "Kategori", key: "category", width: 16 },
  { header: "Brand", key: "brand", width: 14 },
  { header: "Model", key: "model", width: 14 },
  { header: "Serial Number", key: "serialNumber", width: 16 },
  { header: "Kondisi", key: "conditionLabel", width: 10 },
  { header: "Status", key: "statusLabel", width: 12 },
  { header: "Lokasi", key: "location", width: 20 },
  { header: "PIC", key: "pic", width: 14 },
];

export function Tools() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; toolId: number; toolName: string } | null>(null);
  const [newStatus, setNewStatus] = useState("available");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tools, isLoading } = useListTools({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  const { data: stats } = useGetToolStats();
  const updateStatus = useUpdateToolStatus();
  const deleteTool = useDeleteTool();

  const exportData = (tools ?? []).map(t => ({
    ...t,
    conditionLabel: CONDITION_LABELS[t.condition] ?? t.condition,
    statusLabel: STATUS_LABELS[t.status] ?? t.status,
    brand: t.brand ?? "-",
    model: t.model ?? "-",
    serialNumber: t.serialNumber ?? "-",
    location: t.location ?? "-",
    pic: t.pic ?? "-",
  })) as unknown as Record<string, unknown>[];

  function handleDelete(id: number, name: string) {
    if (!confirm(`Hapus alat "${name}"? Data tidak dapat dikembalikan.`)) return;
    deleteTool.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListToolsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetToolStatsQueryKey() });
          toast({ title: "Alat berhasil dihapus" });
        },
        onError: () => toast({ title: "Gagal menghapus alat", variant: "destructive" }),
      }
    );
  }

  function handleStatusUpdate() {
    if (!statusDialog) return;
    updateStatus.mutate(
      { id: statusDialog.toolId, data: { status: newStatus as "available" | "in_use" | "maintenance" | "calibration" | "damaged" | "lost" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListToolsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetToolStatsQueryKey() });
          setStatusDialog(null);
          toast({ title: "Status alat berhasil diperbarui" });
        },
        onError: () => toast({ title: "Gagal memperbarui status", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Alat</h1>
          <p className="text-muted-foreground">Kelola alat dan peralatan gudang</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu data={exportData} columns={EXPORT_COLUMNS} title="Inventory Alat" filename="inventory-alat" />
          <Link href="/tools/new">
            <Button><Plus className="h-4 w-4 mr-2" /> Tambah Alat</Button>
          </Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const statKey = key === "in_use" ? "inUse" : key;
            const count = (stats as unknown as Record<string, number>)[statKey] ?? 0;
            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-md ${status === key ? "ring-2 ring-primary" : ""}`}
                onClick={() => setStatus(status === key ? "all" : key)}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari alat, kode..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama Alat</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kategori</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Brand/Model</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kondisi</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lokasi</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tools?.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Tidak ada alat ditemukan</td></tr>
                  )}
                  {tools?.map(t => (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.code}</td>
                      <td className="px-4 py-3">
                        <Link href={`/tools/${t.id}`} className="font-medium hover:text-primary transition-colors">{t.name}</Link>
                        {t.serialNumber && <div className="text-xs text-muted-foreground">S/N: {t.serialNumber}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{[t.brand, t.model].filter(Boolean).join(" / ") || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{CONDITION_LABELS[t.condition] ?? t.condition}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[t.status] ?? ""}`}>{STATUS_LABELS[t.status] ?? t.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{t.location ?? "-"}</td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/tools/${t.id}`}>Lihat Detail</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setStatusDialog({ open: true, toolId: t.id, toolName: t.name }); setNewStatus(t.status); }}>
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(t.id, t.name)}
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

      <Dialog open={!!statusDialog?.open} onOpenChange={open => !open && setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Status — {statusDialog?.toolName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Status Baru</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Batal</Button>
            <Button onClick={handleStatusUpdate} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
