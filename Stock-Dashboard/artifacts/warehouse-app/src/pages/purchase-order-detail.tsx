import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetPurchaseOrder, useReceivePurchaseOrder, useApprovePurchaseOrder,
  getListPurchaseOrdersQueryKey, getGetPurchaseOrderQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, Package, Truck, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", pending_approval: "Menunggu Persetujuan", approved: "Disetujui",
  sent: "Dikirim ke Supplier", partial_received: "Sebagian Diterima",
  received: "Selesai Diterima", cancelled: "Dibatalkan",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700", sent: "bg-purple-100 text-purple-700",
  partial_received: "bg-orange-100 text-orange-700", received: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STEPS = [
  { key: "draft", label: "Draft", icon: ClipboardList },
  { key: "pending_approval", label: "Menunggu Approval", icon: ClipboardList },
  { key: "approved", label: "Disetujui", icon: CheckCircle },
  { key: "sent", label: "Dikirim", icon: Truck },
  { key: "partial_received", label: "Sebagian Terima", icon: Package },
  { key: "received", label: "Selesai", icon: Package },
];

export function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [receiveDialog, setReceiveDialog] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [approvedBy, setApprovedBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});

  const { data: po, isLoading } = useGetPurchaseOrder(parseInt(id));
  const approvePO = useApprovePurchaseOrder();
  const receivePO = useReceivePurchaseOrder();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetPurchaseOrderQueryKey(parseInt(id)) });
    queryClient.invalidateQueries({ queryKey: getListPurchaseOrdersQueryKey() });
  }

  function handleApprove() {
    if (!approvedBy || !po) return;
    approvePO.mutate(
      { id: po.id, data: { approvedBy } },
      {
        onSuccess: () => { invalidate(); setApproveDialog(false); toast({ title: "PO berhasil disetujui" }); },
        onError: () => toast({ title: "Gagal menyetujui PO", variant: "destructive" }),
      }
    );
  }

  function handleReceive() {
    if (!receivedBy || !po) return;
    const items = Object.entries(receiveQtys)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId: parseInt(itemId), quantityReceived: qty }));
    if (!items.length) { toast({ title: "Masukkan jumlah barang yang diterima", variant: "destructive" }); return; }

    receivePO.mutate(
      { id: po.id, data: { receivedBy, notes: receiveNotes || undefined, items } },
      {
        onSuccess: () => { invalidate(); setReceiveDialog(false); setReceiveQtys({}); toast({ title: "Penerimaan barang berhasil dicatat" }); },
        onError: () => toast({ title: "Gagal mencatat penerimaan", variant: "destructive" }),
      }
    );
  }

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!po) return <div className="text-center py-16 text-muted-foreground">PO tidak ditemukan</div>;

  const currentStepIdx = STEPS.findIndex(s => s.key === po.status);
  const receivableStatuses = ["approved", "sent", "partial_received"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{po.poNumber}</h1>
            <Badge className={`text-xs ${STATUS_COLORS[po.status] ?? ""}`}>{STATUS_LABELS[po.status] ?? po.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Supplier: {po.supplierName} · Dibuat: {new Date(po.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
        </div>
        <div className="flex items-center gap-2">
          {po.status === "pending_approval" && (
            <Button onClick={() => setApproveDialog(true)} className="gap-2">
              <CheckCircle className="h-4 w-4" /> Setujui PO
            </Button>
          )}
          {receivableStatuses.includes(po.status) && (
            <Button onClick={() => { setReceiveDialog(true); setReceiveQtys({}); }} variant="outline" className="gap-2">
              <Package className="h-4 w-4" /> Terima Barang
            </Button>
          )}
        </div>
      </div>

      {/* Progress Tracker */}
      {po.status !== "cancelled" && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              {STEPS.filter(s => s.key !== "partial_received").map((step, idx, arr) => {
                const stepIdx = STEPS.findIndex(s => s.key === step.key);
                const done = currentStepIdx >= stepIdx;
                const isLast = idx === arr.length - 1;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {idx + 1}
                      </div>
                      <div className={`text-[10px] mt-1 text-center max-w-[60px] ${done ? "text-primary font-medium" : "text-muted-foreground"}`}>{step.label}</div>
                    </div>
                    {!isLast && <div className={`h-0.5 flex-1 mx-1 ${done && currentStepIdx > stepIdx ? "bg-primary" : "bg-muted"}`} />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Item Material</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Material</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Pesan</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Terima</th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground">Progress</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Harga Satuan</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {po.items.map(item => {
                      const pct = item.quantityOrdered > 0 ? Math.round((item.quantityReceived / item.quantityOrdered) * 100) : 0;
                      return (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.materialName}</div>
                            {item.materialCode && <div className="text-xs text-muted-foreground font-mono">{item.materialCode}</div>}
                          </td>
                          <td className="px-4 py-3 text-right">{item.quantityOrdered} {item.unit}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${item.quantityReceived >= item.quantityOrdered ? "text-green-600" : item.quantityReceived > 0 ? "text-amber-600" : ""}`}>
                            {item.quantityReceived} {item.unit}
                          </td>
                          <td className="px-4 py-3 w-32">
                            <div className="space-y-1">
                              <Progress value={pct} className="h-1.5" />
                              <div className="text-xs text-muted-foreground text-center">{pct}%</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {(item.unitPrice ?? 0) > 0 ? `Rp ${(item.unitPrice ?? 0).toLocaleString("id-ID")}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {(item.totalPrice ?? 0) > 0 ? `Rp ${(item.totalPrice ?? 0).toLocaleString("id-ID")}` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-bold">
                      <td colSpan={5} className="px-4 py-3 text-right text-sm">Total PO</td>
                      <td className="px-4 py-3 text-right">{(po.totalAmount ?? 0) > 0 ? `Rp ${(po.totalAmount ?? 0).toLocaleString("id-ID")}` : "-"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Informasi PO</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Nomor PO</span><span className="font-mono">{po.poNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span className="font-medium text-right max-w-[180px]">{po.supplierName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dibuat oleh</span><span>{po.requestedBy}</span></div>
              {po.approvedBy && <div className="flex justify-between"><span className="text-muted-foreground">Disetujui oleh</span><span className="text-green-600 font-medium">{po.approvedBy}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Prioritas</span><span className="capitalize">{po.priority}</span></div>
              {po.expectedDelivery && <div className="flex justify-between"><span className="text-muted-foreground">Target Kirim</span><span>{new Date(po.expectedDelivery).toLocaleDateString("id-ID")}</span></div>}
              {po.actualDelivery && <div className="flex justify-between"><span className="text-muted-foreground">Tgl. Diterima</span><span className="text-green-600">{new Date(po.actualDelivery).toLocaleDateString("id-ID")}</span></div>}
              {po.terms && <div><span className="text-muted-foreground block">Termin</span><span>{po.terms}</span></div>}
              {po.notes && <div><span className="text-muted-foreground block">Catatan</span><span className="text-sm">{po.notes}</span></div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialog} onOpenChange={setApproveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Setujui PO — {po.poNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Nama Approver <span className="text-destructive">*</span></Label>
            <Input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} placeholder="Nama lengkap..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(false)}>Batal</Button>
            <Button onClick={handleApprove} disabled={approvePO.isPending || !approvedBy}>Setujui PO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={receiveDialog} onOpenChange={setReceiveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Penerimaan Barang — {po.poNumber}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Diterima Oleh <span className="text-destructive">*</span></Label>
              <Input value={receivedBy} onChange={e => setReceivedBy(e.target.value)} placeholder="Nama penerima..." />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Jumlah yang Diterima</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {po.items.filter(i => i.quantityReceived < i.quantityOrdered).map(item => (
                  <div key={item.id} className="flex items-center gap-3 border rounded-md p-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.materialName}</div>
                      <div className="text-xs text-muted-foreground">Sisa: {item.quantityOrdered - item.quantityReceived} {item.unit}</div>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={item.quantityOrdered - item.quantityReceived}
                      className="w-24 h-8 text-sm"
                      placeholder="0"
                      value={receiveQtys[item.id] ?? ""}
                      onChange={e => setReceiveQtys(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                    />
                    <span className="text-xs text-muted-foreground w-8">{item.unit}</span>
                  </div>
                ))}
                {po.items.every(i => i.quantityReceived >= i.quantityOrdered) && (
                  <div className="text-center text-sm text-green-600 py-3">Semua item sudah diterima</div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan Penerimaan</Label>
              <Input value={receiveNotes} onChange={e => setReceiveNotes(e.target.value)} placeholder="Catatan kondisi barang..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialog(false)}>Batal</Button>
            <Button onClick={handleReceive} disabled={receivePO.isPending || !receivedBy}>Simpan Penerimaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
