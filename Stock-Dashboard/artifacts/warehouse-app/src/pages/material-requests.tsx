import { useState } from "react";
import { Link } from "wouter";
import {
  useListMaterialRequests, useApproveMaterialRequest, useRejectMaterialRequest,
  useDeleteMaterialRequest, getListMaterialRequestsQueryKey,
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
import { Plus, Search, CheckCircle, XCircle, Trash2, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExportMenu } from "@/components/export-menu";
import type { ExportColumn } from "@/lib/export";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  released: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", pending: "Pending", approved: "Disetujui",
  rejected: "Ditolak", released: "Dirilis", completed: "Selesai",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600", medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700", urgent: "bg-red-100 text-red-700",
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "No. Request", key: "requestNumber", width: 22 },
  { header: "Pengaju", key: "requesterName", width: 20 },
  { header: "Departemen", key: "department", width: 18 },
  { header: "Prioritas", key: "priority", width: 10 },
  { header: "Jumlah Item", key: "itemCount", width: 12 },
  { header: "Tgl. Dibutuhkan", key: "neededDate", width: 16 },
  { header: "Status", key: "statusLabel", width: 12 },
  { header: "Disetujui Oleh", key: "approvedBy", width: 18 },
  { header: "Catatan", key: "notes", width: 24 },
  { header: "Dibuat", key: "createdAt", width: 16 },
];

export function MaterialRequests() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [approvalDialog, setApprovalDialog] = useState<{ type: "approve" | "reject"; id: number; requestNumber: string } | null>(null);
  const [approvedBy, setApprovedBy] = useState("");
  const [notes, setNotes] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests, isLoading } = useListMaterialRequests({
    status: status === "all" ? undefined : status,
  });

  const approve = useApproveMaterialRequest();
  const reject = useRejectMaterialRequest();
  const deleteRequest = useDeleteMaterialRequest();

  const filtered = requests?.filter(r =>
    !search ||
    r.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.requesterName.toLowerCase().includes(search.toLowerCase()) ||
    r.department.toLowerCase().includes(search.toLowerCase())
  );

  const exportData = (filtered ?? []).map(r => ({
    ...r,
    statusLabel: STATUS_LABELS[r.status] ?? r.status,
    itemCount: r.items.length,
    neededDate: r.neededDate ? new Date(r.neededDate).toLocaleDateString("id-ID") : "-",
    approvedBy: r.approvedBy ?? "-",
    notes: r.notes ?? "-",
    createdAt: new Date(r.createdAt).toLocaleDateString("id-ID"),
  })) as unknown as Record<string, unknown>[];

  function handleDelete(id: number, requestNumber: string) {
    if (!confirm(`Hapus pengajuan "${requestNumber}"? Data tidak dapat dikembalikan.`)) return;
    deleteRequest.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMaterialRequestsQueryKey() });
          toast({ title: "Pengajuan berhasil dihapus" });
        },
        onError: () => toast({ title: "Gagal menghapus pengajuan", variant: "destructive" }),
      }
    );
  }

  function handleApproval() {
    if (!approvalDialog || !approvedBy) return;
    const mutation = approvalDialog.type === "approve" ? approve : reject;
    mutation.mutate(
      { id: approvalDialog.id, data: { approvedBy, notes: notes || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMaterialRequestsQueryKey() });
          setApprovalDialog(null);
          setApprovedBy("");
          setNotes("");
          toast({ title: approvalDialog.type === "approve" ? "Pengajuan disetujui" : "Pengajuan ditolak" });
        },
        onError: () => toast({ title: "Gagal memproses pengajuan", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengajuan Material</h1>
          <p className="text-muted-foreground">Kelola pengajuan dan persetujuan material</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu data={exportData} columns={EXPORT_COLUMNS} title="Pengajuan Material" filename="pengajuan-material" />
          <Link href="/material-requests/new">
            <Button><Plus className="h-4 w-4 mr-2" /> Buat Pengajuan</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nomor request, nama, departemen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">No. Request</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pengaju</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Departemen</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prioritas</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Item</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tgl. Butuh</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered?.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Tidak ada pengajuan ditemukan</td></tr>
                  )}
                  {filtered?.map(r => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        <Link href={`/material-requests/${r.id}`} className="hover:text-primary font-medium">{r.requestNumber}</Link>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.requesterName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.department}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs capitalize ${PRIORITY_COLORS[r.priority] ?? ""}`}>{r.priority}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">{r.items.length}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.neededDate ? new Date(r.neededDate).toLocaleDateString("id-ID") : "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[r.status] ?? ""}`}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/material-requests/${r.id}`}>Lihat Detail</Link></DropdownMenuItem>
                            {r.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  className="text-green-600 focus:text-green-600"
                                  onClick={() => setApprovalDialog({ type: "approve", id: r.id, requestNumber: r.requestNumber })}
                                >
                                  <CheckCircle className="h-3 w-3 mr-2" /> Setujui
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setApprovalDialog({ type: "reject", id: r.id, requestNumber: r.requestNumber })}
                                >
                                  <XCircle className="h-3 w-3 mr-2" /> Tolak
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(r.id, r.requestNumber)}
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

      <Dialog open={!!approvalDialog} onOpenChange={open => !open && setApprovalDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approvalDialog?.type === "approve" ? "Setujui" : "Tolak"} Pengajuan — {approvalDialog?.requestNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Approver <span className="text-destructive">*</span></Label>
              <Input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} placeholder="Nama lengkap approver..." />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan opsional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>Batal</Button>
            <Button
              onClick={handleApproval}
              disabled={(approve.isPending || reject.isPending) || !approvedBy}
              variant={approvalDialog?.type === "reject" ? "destructive" : "default"}
            >
              {approvalDialog?.type === "approve" ? "Setujui" : "Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
