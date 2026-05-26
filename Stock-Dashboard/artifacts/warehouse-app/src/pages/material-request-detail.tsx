import { useParams, useLocation } from "wouter";
import { useGetMaterialRequest, getGetMaterialRequestQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle, XCircle, Clock, Package } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700",
  released: "bg-blue-100 text-blue-700", completed: "bg-purple-100 text-purple-700",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", pending: "Pending", approved: "Disetujui",
  rejected: "Ditolak", released: "Dirilis", completed: "Selesai",
};

const steps = ["draft", "pending", "approved", "released", "completed"];

export function MaterialRequestDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const { data: request, isLoading } = useGetMaterialRequest(id, { query: { enabled: !!id, queryKey: getGetMaterialRequestQueryKey(id) } });

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  if (!request) return <div className="text-center py-16 text-muted-foreground">Pengajuan tidak ditemukan</div>;

  const currentStep = request.status === "rejected" ? -1 : steps.indexOf(request.status);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/material-requests")} data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">{request.requestNumber}</h1>
          <p className="text-muted-foreground">Detail Pengajuan Material</p>
        </div>
        <Badge className={`text-xs ${STATUS_COLORS[request.status] ?? ""}`}>{STATUS_LABELS[request.status] ?? request.status}</Badge>
      </div>

      {/* Workflow tracker */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-border -translate-y-1/2 z-0" />
            {request.status === "rejected" ? (
              <div className="flex items-center gap-2 text-destructive z-10 bg-card px-2">
                <XCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Ditolak oleh {request.approvedBy}</span>
              </div>
            ) : (
              steps.map((step, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                return (
                  <div key={step} className="flex flex-col items-center gap-1 z-10 bg-card px-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-colors
                      ${done ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border text-muted-foreground"}`}>
                      {done && i < currentStep ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-xs ${active ? "font-semibold text-primary" : "text-muted-foreground"}`}>{STATUS_LABELS[step]}</span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Informasi Pengaju</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            {[
              ["Pengaju", request.requesterName],
              ["Departemen", request.department],
              ["Lokasi Kerja", request.workLocation ?? "-"],
              ["Jenis Pekerjaan", request.jobType ?? "-"],
              ["Tanggal Dibutuhkan", request.neededDate ? new Date(request.neededDate).toLocaleDateString("id-ID") : "-"],
              ["Prioritas", request.priority],
              ["Dibuat", new Date(request.createdAt).toLocaleDateString("id-ID")],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium capitalize">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Approval</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            {request.approvedBy ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diproses oleh</span>
                  <span className="font-medium">{request.approvedBy}</span>
                </div>
                {request.approvalNotes && (
                  <div>
                    <span className="text-muted-foreground">Catatan</span>
                    <p className="mt-1 p-2 bg-muted rounded text-sm">{request.approvalNotes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Menunggu persetujuan</span>
              </div>
            )}
            {request.notes && (
              <div>
                <span className="text-muted-foreground block mb-1">Catatan Pengaju</span>
                <p className="p-2 bg-muted rounded text-sm">{request.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Daftar Material ({request.items.length} item)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">#</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Kode</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Nama Material</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Jumlah</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Satuan</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {request.items.map((item, i) => (
                <tr key={item.id} className="hover:bg-muted/20" data-testid={`row-item-${item.id}`}>
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2 font-mono text-xs">{item.materialCode}</td>
                  <td className="px-4 py-2 font-medium">{item.materialName}</td>
                  <td className="px-4 py-2 text-right font-semibold">{item.quantity}</td>
                  <td className="px-4 py-2 text-muted-foreground">{item.unit}</td>
                  <td className="px-4 py-2 text-muted-foreground">{item.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
