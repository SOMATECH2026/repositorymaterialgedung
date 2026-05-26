import { useState } from "react";
import { Link } from "wouter";
import {
  useListPurchaseOrders, useDeletePurchaseOrder, useApprovePurchaseOrder,
  getListPurchaseOrdersQueryKey,
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
import { Plus, Search, CheckCircle, MoreHorizontal, Trash2, ShoppingCart } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ExportMenu } from "@/components/export-menu";
import type { ExportColumn } from "@/lib/export";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", pending_approval: "Menunggu Persetujuan", approved: "Disetujui",
  sent: "Dikirim ke Supplier", partial_received: "Sebagian Diterima",
  received: "Selesai Diterima", cancelled: "Dibatalkan",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  pending_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sent: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  partial_received: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  received: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600", medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700", urgent: "bg-red-100 text-red-700",
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "No. PO", key: "poNumber", width: 22 },
  { header: "Supplier", key: "supplierName", width: 26 },
  { header: "Dibuat Oleh", key: "requestedBy", width: 18 },
  { header: "Prioritas", key: "priority", width: 10 },
  { header: "Tgl. Exp. Kirim", key: "expectedDeliveryFmt", width: 16 },
  { header: "Total", key: "totalAmountFmt", width: 16 },
  { header: "Status", key: "statusLabel", width: 20 },
  { header: "Disetujui Oleh", key: "approvedBy", width: 18 },
];

export function PurchaseOrders() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [approveDialog, setApproveDialog] = useState<{ id: number; poNumber: string } | null>(null);
  const [approvedBy, setApprovedBy] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders, isLoading } = useListPurchaseOrders({
    status: status === "all" ? undefined : status,
    search: search || undefined,
  });

  const deletePO = useDeletePurchaseOrder();
  const approvePO = useApprovePurchaseOrder();

  const summaryByStatus = (orders ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const exportData = (orders ?? []).map(o => ({
    ...o,
    statusLabel: STATUS_LABELS[o.status] ?? o.status,
    approvedBy: o.approvedBy ?? "-",
    expectedDeliveryFmt: o.expectedDelivery ? new Date(o.expectedDelivery).toLocaleDateString("id-ID") : "-",
    totalAmountFmt: `Rp ${(o.totalAmount ?? 0).toLocaleString("id-ID")}`,
  })) as unknown as Record<string, unknown>[];

  function handleDelete(id: number, poNumber: string) {
    if (!confirm(`Hapus PO "${poNumber}"? Data tidak dapat dikembalikan.`)) return;
    deletePO.mutate(
      { id },
      {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() }); toast({ title: "PO berhasil dihapus" }); },
        onError: () => toast({ title: "Gagal menghapus PO", variant: "destructive" }),
      }
    );
  }

  function handleApprove() {
    if (!approveDialog || !approvedBy) return;
    approvePO.mutate(
      { id: approveDialog.id, data: { approvedBy } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
          setApproveDialog(null); setApprovedBy("");
          toast({ title: "PO berhasil disetujui" });
        },
        onError: () => toast({ title: "Gagal menyetujui PO", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Order</h1>
          <p className="text-muted-foreground">Kelola pengadaan material dari supplier</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu data={exportData} columns={EXPORT_COLUMNS} title="Purchase Order" filename="purchase-orders" />
          <Link href="/purchase-orders/new">
            <Button><Plus className="h-4 w-4 mr-2" /> Buat PO</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["pending_approval", "approved", "partial_received", "received"] as const).map(s => (
          <Card key={s} className={`cursor-pointer transition-all hover:shadow-md ${status === s ? "ring-2 ring-primary" : ""}`} onClick={() => setStatus(status === s ? "all" : s)}>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{summaryByStatus[s] ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{STATUS_LABELS[s]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nomor PO, supplier..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">No. PO</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dibuat</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Item</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Exp. Kirim</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders?.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                      <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Belum ada purchase order.
                    </td></tr>
                  )}
                  {orders?.map(o => (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${PRIORITY_COLORS[o.priority] ?? ""}`}>{o.priority.toUpperCase()}</Badge>
                          <Link href={`/purchase-orders/${o.id}`} className="font-mono text-xs hover:text-primary font-medium">{o.poNumber}</Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.supplierName}</div>
                        <div className="text-xs text-muted-foreground">Oleh: {o.requestedBy}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleDateString("id-ID")}</td>
                      <td className="px-4 py-3 text-center">{o.items.length}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {(o.totalAmount ?? 0) > 0 ? `Rp ${(o.totalAmount ?? 0).toLocaleString("id-ID")}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {o.expectedDelivery ? new Date(o.expectedDelivery).toLocaleDateString("id-ID") : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[o.status] ?? ""}`}>{STATUS_LABELS[o.status] ?? o.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/purchase-orders/${o.id}`}>Lihat Detail</Link></DropdownMenuItem>
                            {o.status === "pending_approval" && (
                              <DropdownMenuItem className="text-green-600 focus:text-green-600" onClick={() => setApproveDialog({ id: o.id, poNumber: o.poNumber })}>
                                <CheckCircle className="h-3 w-3 mr-2" /> Setujui
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(o.id, o.poNumber)}>
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

      <Dialog open={!!approveDialog} onOpenChange={open => !open && setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Setujui PO — {approveDialog?.poNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Nama Approver <span className="text-destructive">*</span></Label>
            <Input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} placeholder="Nama lengkap..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>Batal</Button>
            <Button onClick={handleApprove} disabled={approvePO.isPending || !approvedBy}>Setujui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
