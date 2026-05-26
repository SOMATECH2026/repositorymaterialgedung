import { useParams, useLocation } from "wouter";
import { useGetToolRequest, getGetToolRequestQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Wrench, Clock, User, Calendar } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700", in_use: "bg-purple-100 text-purple-700",
  returned: "bg-green-100 text-green-700", overdue: "bg-red-200 text-red-800",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", approved: "Disetujui", rejected: "Ditolak",
  in_use: "Digunakan", returned: "Dikembalikan", overdue: "Terlambat",
};

export function ToolRequestDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const { data: request, isLoading } = useGetToolRequest(id, { query: { enabled: !!id, queryKey: getGetToolRequestQueryKey(id) } });

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (!request) return <div className="text-center py-16 text-muted-foreground">Pengajuan tidak ditemukan</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tool-requests")} data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">{request.requestNumber}</h1>
          <p className="text-muted-foreground">Detail Pengajuan Alat</p>
        </div>
        <Badge className={`text-xs ${STATUS_COLORS[request.status] ?? ""}`}>{STATUS_LABELS[request.status] ?? request.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Detail Alat</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            <div>
              <p className="font-semibold text-base">{request.toolName}</p>
              <p className="text-xs font-mono text-muted-foreground">{request.toolCode}</p>
            </div>
            {[
              ["Pengaju", request.requesterName],
              ["Departemen", request.department],
              ["Tujuan", request.purpose ?? "-"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Jadwal Pemakaian</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            {[
              ["Mulai", new Date(request.scheduledStart).toLocaleString("id-ID")],
              ["Selesai", new Date(request.scheduledEnd).toLocaleString("id-ID")],
              ["Pengembalian Aktual", request.actualReturn ? new Date(request.actualReturn).toLocaleString("id-ID") : "-"],
              ["Kondisi Kembali", request.conditionOnReturn ?? "-"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {(request.approvedBy || request.notes) && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Approval</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            {request.approvedBy && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disetujui oleh</span>
                <span className="font-medium">{request.approvedBy}</span>
              </div>
            )}
            {request.notes && <p className="p-2 bg-muted rounded">{request.notes}</p>}
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground">
        Dibuat: {new Date(request.createdAt).toLocaleDateString("id-ID")}
      </div>
    </div>
  );
}
