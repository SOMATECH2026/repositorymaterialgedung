import { useState } from "react";
import { Link } from "wouter";
import {
  useListToolRequests, useApproveToolRequest, useReturnToolRequest,
  useDeleteToolRequest, getListToolRequestsQueryKey,
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
import { Plus, Search, CheckCircle, RotateCcw, Trash2, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExportMenu } from "@/components/export-menu";
import type { ExportColumn } from "@/lib/export";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  in_use: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  returned: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", approved: "Disetujui", rejected: "Ditolak",
  in_use: "Digunakan", returned: "Dikembalikan", overdue: "Terlambat",
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "No. Request", key: "requestNumber", width: 22 },
  { header: "Pengaju", key: "requesterName", width: 20 },
  { header: "Departemen", key: "department", width: 16 },
  { header: "Alat", key: "toolName", width: 24 },
  { header: "Kode Alat", key: "toolCode", width: 14 },
  { header: "Mulai", key: "scheduledStartFmt", width: 16 },
  { header: "Selesai", key: "scheduledEndFmt", width: 16 },
  { header: "Status", key: "statusLabel", width: 14 },
  { header: "Disetujui Oleh", key: "approvedBy", width: 18 },
  { header: "Kondisi Kembali", key: "conditionOnReturn", width: 16 },
];

export function ToolRequests() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [approveDialog, setApproveDialog] = useState<{ id: number; requestNumber: string } | null>(null);
  const [returnDialog, setReturnDialog] = useState<{ id: number; requestNumber: string } | null>(null);
  const [approvedBy, setApprovedBy] = useState("");
  const [conditionOnReturn, setConditionOnReturn] = useState("good");
  const [returnNotes, setReturnNotes] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests, isLoading } = useListToolRequests({
    status: status === "all" ? undefined : status,
  });

  const approve = useApproveToolRequest();
  const returnTool = useReturnToolRequest();
  const deleteRequest = useDeleteToolRequest();

  const filtered = requests?.filter(r =>
    !search ||
    r.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.requesterName.toLowerCase().includes(search.toLowerCase()) ||
    r.toolName.toLowerCase().includes(search.toLowerCase())
  );

  const exportData = (filtered ?? []).map(r => ({
    ...r,
    statusLabel: STATUS_LABELS[r.status] ?? r.status,
    scheduledStartFmt: new Date(r.scheduledStart).toLocaleDateString("id-ID"),
    scheduledEndFmt: new Date(r.scheduledEnd).toLocaleDateString("id-ID"),
    approvedBy: r.approvedBy ?? "-",
    conditionOnReturn: r.conditionOnReturn ?? "-",
  })) as unknown as Record<string, unknown>[];

  function handleDelete(id: number, requestNumber: string) {
    if (!confirm(`Hapus pengajuan alat "${requestNumber}"? Data tidak dapat dikembalikan.`)) return;
    deleteRequest.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListToolRequestsQueryKey() });
          toast({ title: "Pengajuan berhasil dihapus" });
        },
        onError: () => toast({ title: "Gagal menghapus pengajuan", variant: "destructive" }),
      }
    );
  }

  function handleApprove() {
    if (!approveDialog || !approvedBy) return;
    approve.mutate(
      { id: approveDialog.id, data: { approvedBy } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListToolRequestsQueryKey() });
          setApproveDialog(null);
          setApprovedBy("");
          toast({ title: "Pengajuan disetujui" });
        },
        onError: () => toast({ title: "Gagal menyetujui pengajuan", variant: "destructive" }),
      }
    );
  }

  function handleReturn() {
    if (!returnDialog) return;
    returnTool.mutate(
      { id: returnDialog.id, data: { conditionOnReturn: conditionOnReturn as "good" | "fair" | "poor" | "damaged", notes: returnNotes || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListToolRequestsQueryKey() });
          setReturnDialog(null);
          setReturnNotes("");
          toast({ title: "Alat berhasil dikembalikan" });
        },
        onError: () => toast({ title: "Gagal memproses pengembalian", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengajuan Alat</h1>
          <p className="text-muted-foreground">Kelola peminjaman dan pengembalian alat</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu data={exportData} columns={EXPORT_COLUMNS} title="Pengajuan Alat" filename="pengajuan-alat" />
          <Link href="/tool-requests/new">
            <Button><Plus className="h-4 w-4 mr-2" /> Buat Pengajuan</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nomor request, nama, alat..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Alat</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Jadwal</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered?.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Tidak ada pengajuan ditemukan</td></tr>
                  )}
                  {filtered?.map(r => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/tool-requests/${r.id}`} className="font-mono text-xs hover:text-primary font-medium">{r.requestNumber}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.requesterName}</div>
                        <div className="text-xs text-muted-foreground">{r.department}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.toolName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.toolCode}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        <div>{new Date(r.scheduledStart).toLocaleDateString("id-ID")}</div>
                        <div>s/d {new Date(r.scheduledEnd).toLocaleDateString("id-ID")}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[r.status] ?? ""}`}>{STATUS_LABELS[r.status] ?? r.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/tool-requests/${r.id}`}>Lihat Detail</Link></DropdownMenuItem>
                            {r.status === "pending" && (
                              <DropdownMenuItem
                                className="text-green-600 focus:text-green-600"
                                onClick={() => setApproveDialog({ id: r.id, requestNumber: r.requestNumber })}
                              >
                                <CheckCircle className="h-3 w-3 mr-2" /> Setujui
                              </DropdownMenuItem>
                            )}
                            {(r.status === "approved" || r.status === "in_use") && (
                              <DropdownMenuItem
                                className="text-blue-600 focus:text-blue-600"
                                onClick={() => { setReturnDialog({ id: r.id, requestNumber: r.requestNumber }); setConditionOnReturn("good"); }}
                              >
                                <RotateCcw className="h-3 w-3 mr-2" /> Kembalikan
                              </DropdownMenuItem>
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

      <Dialog open={!!approveDialog} onOpenChange={open => !open && setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Setujui Pengajuan — {approveDialog?.requestNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Nama Approver <span className="text-destructive">*</span></Label>
            <Input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} placeholder="Nama lengkap..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>Batal</Button>
            <Button onClick={handleApprove} disabled={approve.isPending || !approvedBy}>Setujui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnDialog} onOpenChange={open => !open && setReturnDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kembalikan Alat — {returnDialog?.requestNumber}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kondisi Pengembalian <span className="text-destructive">*</span></Label>
              <Select value={conditionOnReturn} onValueChange={setConditionOnReturn}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Baik</SelectItem>
                  <SelectItem value="fair">Cukup</SelectItem>
                  <SelectItem value="poor">Buruk</SelectItem>
                  <SelectItem value="damaged">Rusak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="Catatan kondisi..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog(null)}>Batal</Button>
            <Button onClick={handleReturn} disabled={returnTool.isPending}>Kembalikan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
