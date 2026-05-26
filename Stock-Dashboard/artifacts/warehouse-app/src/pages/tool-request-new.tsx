import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateToolRequest, useListTools, getListToolRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ToolRequestNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    requesterName: "", department: "", toolId: "",
    scheduledStart: "", scheduledEnd: "", purpose: "", notes: "",
  });

  const { data: tools } = useListTools({ status: "available" });
  const createRequest = useCreateToolRequest();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.toolId || !form.scheduledStart || !form.scheduledEnd) {
      toast({ title: "Lengkapi semua field wajib", variant: "destructive" });
      return;
    }
    createRequest.mutate(
      {
        data: {
          requesterName: form.requesterName,
          department: form.department,
          toolId: parseInt(form.toolId),
          scheduledStart: form.scheduledStart,
          scheduledEnd: form.scheduledEnd,
          purpose: form.purpose || undefined,
          notes: form.notes || undefined,
        },
      },
      {
        onSuccess: (req) => {
          queryClient.invalidateQueries({ queryKey: getListToolRequestsQueryKey() });
          toast({ title: "Pengajuan berhasil dibuat", description: req.requestNumber });
          navigate("/tool-requests");
        },
        onError: () => toast({ title: "Gagal membuat pengajuan", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tool-requests")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Pengajuan Alat</h1>
          <p className="text-muted-foreground">Isi formulir peminjaman alat</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informasi Pengajuan</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Pengaju <span className="text-destructive">*</span></Label>
              <Input required value={form.requesterName} onChange={e => setForm(f => ({ ...f, requesterName: e.target.value }))} placeholder="Nama lengkap..." data-testid="input-requester-name" />
            </div>
            <div className="space-y-2">
              <Label>Departemen <span className="text-destructive">*</span></Label>
              <Input required value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Departemen..." data-testid="input-department" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Alat yang Dipinjam <span className="text-destructive">*</span></Label>
              <Select value={form.toolId} onValueChange={v => setForm(f => ({ ...f, toolId: v }))}>
                <SelectTrigger data-testid="select-tool"><SelectValue placeholder="Pilih alat yang tersedia..." /></SelectTrigger>
                <SelectContent>
                  {tools?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Mulai <span className="text-destructive">*</span></Label>
              <Input type="datetime-local" value={form.scheduledStart} onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))} data-testid="input-scheduled-start" />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai <span className="text-destructive">*</span></Label>
              <Input type="datetime-local" value={form.scheduledEnd} onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))} data-testid="input-scheduled-end" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Tujuan Penggunaan</Label>
              <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Tujuan penggunaan alat..." data-testid="input-purpose" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Catatan</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan tambahan..." data-testid="input-notes" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/tool-requests")}>Batal</Button>
          <Button type="submit" disabled={createRequest.isPending} data-testid="button-submit-tool-request">
            {createRequest.isPending ? "Menyimpan..." : "Buat Pengajuan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
